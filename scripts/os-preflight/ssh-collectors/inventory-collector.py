#!/usr/bin/env python3
"""
Huawei Cloud Migration OS Pre-Flight Collector
Collects source system inventory for migration assessment
"""

import paramiko
import json
import yaml
import subprocess
import platform
import socket
import os
import sys
import re
from datetime import datetime
from typing import Dict, List, Any, Optional

class OSInventoryCollector:
    def __init__(self, ssh_host: str, ssh_port: int = 22, 
                 ssh_user: str = "root", ssh_key_path: Optional[str] = None):
        self.ssh_host = ssh_host
        self.ssh_port = ssh_port
        self.ssh_user = ssh_user
        self.ssh_key_path = ssh_key_path
        self.client = None
        self.inventory = {}
        
    def connect(self) -> bool:
        """Establish SSH connection to source system"""
        try:
            self.client = paramiko.SSHClient()
            self.client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            if self.ssh_key_path:
                key = paramiko.RSAKey.from_private_key_file(self.ssh_key_path)
                self.client.connect(
                    hostname=self.ssh_host,
                    port=self.ssh_port,
                    username=self.ssh_user,
                    pkey=key,
                    timeout=30
                )
            else:
                # For password auth (not recommended in production)
                self.client.connect(
                    hostname=self.ssh_host,
                    port=self.ssh_port,
                    username=self.ssh_user,
                    timeout=30
                )
            return True
        except Exception as e:
            print(f"SSH connection failed: {e}")
            return False
    
    def execute_command(self, command: str) -> str:
        """Execute command via SSH and return output"""
        if not self.client:
            print("SSH client not connected")
            return ""
        try:
            stdin, stdout, stderr = self.client.exec_command(command, timeout=60)
            output = stdout.read().decode('utf-8').strip()
            error = stderr.read().decode('utf-8').strip()
            
            if error and "WARNING" not in error:
                print(f"Command warning: {error}")
            
            return output
        except Exception as e:
            print(f"Command execution failed: {e}")
            return ""
    
    def collect_os_info(self):
        """Collect OS distribution and version"""
        # Try different methods to get OS info
        commands = [
            "cat /etc/os-release",
            "lsb_release -a 2>/dev/null || true",
            "uname -a",
            "cat /etc/redhat-release 2>/dev/null || true",
            "cat /etc/SuSE-release 2>/dev/null || true"
        ]
        
        os_info = {}
        for cmd in commands:
            output = self.execute_command(cmd)
            if output:
                os_info[cmd] = output
        
        # Parse OS release file
        if "cat /etc/os-release" in os_info:
            release_data = os_info["cat /etc/os-release"]
            for line in release_data.split('\n'):
                if '=' in line:
                    key, value = line.split('=', 1)
                    os_info[key.strip()] = value.strip().strip('"')
        
        self.inventory['os'] = os_info
    
    def collect_cpu_info(self):
        """Collect CPU information"""
        cpu_info = {}
        
        # CPU model and cores
        cpu_model = self.execute_command("lscpu | grep 'Model name' | cut -d':' -f2 | xargs")
        cpu_cores = self.execute_command("nproc")
        cpu_arch = self.execute_command("uname -m")
        
        cpu_info['model'] = cpu_model
        cpu_info['cores'] = int(cpu_cores) if cpu_cores.isdigit() else 0
        cpu_info['architecture'] = cpu_arch
        cpu_info['threads_per_core'] = self.execute_command("lscpu | grep 'Thread(s) per core' | cut -d':' -f2 | xargs")
        cpu_info['sockets'] = self.execute_command("lscpu | grep 'Socket(s)' | cut -d':' -f2 | xargs")
        
        # CPU utilization
        cpu_load = self.execute_command("uptime | awk -F'load average:' '{print $2}' | xargs")
        cpu_info['load_average'] = cpu_load
        
        self.inventory['cpu'] = cpu_info
    
    def collect_memory_info(self):
        """Collect memory information"""
        memory_info = {}
        
        # Total memory
        mem_total = self.execute_command("free -b | grep Mem | awk '{print $2}'")
        mem_used = self.execute_command("free -b | grep Mem | awk '{print $3}'")
        mem_free = self.execute_command("free -b | grep Mem | awk '{print $4}'")
        
        memory_info['total_bytes'] = int(mem_total) if mem_total.isdigit() else 0
        memory_info['used_bytes'] = int(mem_used) if mem_used.isdigit() else 0
        memory_info['free_bytes'] = int(mem_free) if mem_free.isdigit() else 0
        
        # Swap memory
        swap_total = self.execute_command("free -b | grep Swap | awk '{print $2}'")
        swap_used = self.execute_command("free -b | grep Swap | awk '{print $3}'")
        
        memory_info['swap_total_bytes'] = int(swap_total) if swap_total.isdigit() else 0
        memory_info['swap_used_bytes'] = int(swap_used) if swap_used.isdigit() else 0
        
        self.inventory['memory'] = memory_info
    
    def collect_disk_info(self):
        """Collect disk and filesystem information"""
        disk_info = {}
        
        # Disk usage
        df_output = self.execute_command("df -B1 --output=source,fstype,size,used,avail,pcent,target | tail -n +2")
        disks = []
        
        for line in df_output.split('\n'):
            if line.strip():
                parts = line.split()
                if len(parts) >= 7:
                    disk = {
                        'device': parts[0],
                        'filesystem': parts[1],
                        'total_bytes': int(parts[2]) if parts[2].isdigit() else 0,
                        'used_bytes': int(parts[3]) if parts[3].isdigit() else 0,
                        'available_bytes': int(parts[4]) if parts[4].isdigit() else 0,
                        'usage_percent': parts[5].replace('%', ''),
                        'mount_point': parts[6]
                    }
                    disks.append(disk)
        
        disk_info['filesystems'] = disks
        
        # Block devices
        lsblk_output = self.execute_command("lsblk -b -o NAME,SIZE,TYPE,MOUNTPOINT,FSTYPE,MODEL | grep -v '^NAME'")
        block_devices = []
        
        for line in lsblk_output.split('\n'):
            if line.strip():
                parts = line.split()
                if len(parts) >= 6:
                    device = {
                        'name': parts[0],
                        'size_bytes': int(parts[1]) if parts[1].isdigit() else 0,
                        'type': parts[2],
                        'mountpoint': parts[3] if parts[3] != '-' else None,
                        'filesystem': parts[4] if parts[4] != '-' else None,
                        'model': ' '.join(parts[5:]) if len(parts) > 5 else None
                    }
                    block_devices.append(device)
        
        disk_info['block_devices'] = block_devices
        
        self.inventory['storage'] = disk_info
    
    def collect_network_info(self):
        """Collect network configuration"""
        network_info = {}
        
        # IP addresses and interfaces
        ip_output = self.execute_command("ip -j addr show")
        try:
            interfaces = json.loads(ip_output)
            network_info['interfaces'] = interfaces
        except:
            network_info['interfaces_raw'] = ip_output
        
        # Routing table
        route_output = self.execute_command("ip -j route show")
        try:
            routes = json.loads(route_output)
            network_info['routes'] = routes
        except:
            network_info['routes_raw'] = route_output
        
        # DNS configuration
        resolv_conf = self.execute_command("cat /etc/resolv.conf 2>/dev/null || echo 'No resolv.conf'")
        network_info['dns'] = resolv_conf
        
        # Network connections
        ss_output = self.execute_command("ss -tuln")
        network_info['connections'] = ss_output
        
        self.inventory['network'] = network_info
    
    def collect_package_info(self):
        """Collect installed packages and services"""
        package_info = {}
        
        # Detect package manager
        if self.execute_command("which yum"):
            package_manager = "yum"
            packages = self.execute_command("yum list installed 2>/dev/null | tail -n +2 | wc -l")
            package_info['manager'] = "yum"
            package_info['count'] = int(packages) if packages.isdigit() else 0
        elif self.execute_command("which apt"):
            package_manager = "apt"
            packages = self.execute_command("dpkg -l | grep '^ii' | wc -l")
            package_info['manager'] = "apt"
            package_info['count'] = int(packages) if packages.isdigit() else 0
        elif self.execute_command("which zypper"):
            package_manager = "zypper"
            packages = self.execute_command("zypper se --installed-only | tail -n +5 | wc -l")
            package_info['manager'] = "zypper"
            package_info['count'] = int(packages) if packages.isdigit() else 0
        else:
            package_info['manager'] = "unknown"
            package_info['count'] = 0
        
        # Systemd services
        services = self.execute_command("systemctl list-units --type=service --state=running 2>/dev/null | head -20")
        package_info['running_services'] = services
        
        # Kernel modules
        modules = self.execute_command("lsmod | head -20")
        package_info['kernel_modules'] = modules
        
        self.inventory['packages'] = package_info
    
    def collect_security_info(self):
        """Collect security-related information"""
        security_info = {}
        
        # SELinux status
        selinux = self.execute_command("getenforce 2>/dev/null || echo 'Disabled'")
        security_info['selinux'] = selinux
        
        # Firewall status
        firewall_cmds = [
            "systemctl is-active firewalld 2>/dev/null || echo 'inactive'",
            "systemctl is-active ufw 2>/dev/null || echo 'inactive'",
            "systemctl is-active iptables 2>/dev/null || echo 'inactive'"
        ]
        
        for cmd in firewall_cmds:
            status = self.execute_command(cmd)
            if status != "inactive":
                security_info['firewall'] = status
                break
        
        # SSH configuration
        sshd_config = self.execute_command("grep -E '^(PermitRootLogin|PasswordAuthentication|Port)' /etc/ssh/sshd_config 2>/dev/null || echo 'No sshd_config'")
        security_info['ssh_config'] = sshd_config
        
        # Last login
        last_login = self.execute_command("last -n 5")
        security_info['recent_logins'] = last_login
        
        self.inventory['security'] = security_info
    
    def collect_all(self):
        """Collect all inventory data"""
        print(f"Collecting inventory from {self.ssh_host}...")
        
        if not self.connect():
            return False
        
        try:
            self.collect_os_info()
            self.collect_cpu_info()
            self.collect_memory_info()
            self.collect_disk_info()
            self.collect_network_info()
            self.collect_package_info()
            self.collect_security_info()
            
            # Add metadata
            self.inventory['metadata'] = {
                'collection_time': datetime.now().isoformat(),
                'source_host': self.ssh_host,
                'collector_version': '1.0.0'
            }
            
            return True
            
        finally:
            if self.client:
                self.client.close()
    
    def save_inventory(self, output_file: str):
        """Save inventory to JSON file"""
        with open(output_file, 'w') as f:
            json.dump(self.inventory, f, indent=2, default=str)
        print(f"Inventory saved to {output_file}")
    
    def print_summary(self):
        """Print human-readable summary"""
        print("\n" + "="*60)
        print(f"OS Pre-Flight Inventory Summary - {self.ssh_host}")
        print("="*60)
        
        if 'os' in self.inventory:
            os_name = self.inventory['os'].get('PRETTY_NAME', 'Unknown')
            print(f"OS: {os_name}")
        
        if 'cpu' in self.inventory:
            cpu = self.inventory['cpu']
            print(f"CPU: {cpu.get('model', 'Unknown')} - {cpu.get('cores', 0)} cores")
        
        if 'memory' in self.inventory:
            mem = self.inventory['memory']
            total_gb = mem.get('total_bytes', 0) / (1024**3)
            print(f"Memory: {total_gb:.2f} GB total, {mem.get('used_bytes', 0) / (1024**3):.2f} GB used")
        
        if 'storage' in self.inventory:
            storage = self.inventory['storage']
            if 'filesystems' in storage:
                total_disk = sum(d.get('total_bytes', 0) for d in storage['filesystems'])
                print(f"Storage: {total_disk / (1024**3):.2f} GB total across {len(storage['filesystems'])} filesystems")
        
        if 'network' in self.inventory:
            network = self.inventory['network']
            if 'interfaces' in network and isinstance(network['interfaces'], list):
                ip_count = sum(len(i.get('addr_info', [])) for i in network['interfaces'])
                print(f"Network: {len(network['interfaces'])} interfaces, {ip_count} IP addresses")
        
        print("="*60)

def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Huawei Cloud Migration OS Pre-Flight Collector')
    parser.add_argument('host', help='Source system hostname or IP')
    parser.add_argument('--user', '-u', default='root', help='SSH username')
    parser.add_argument('--port', '-p', type=int, default=22, help='SSH port')
    parser.add_argument('--key', '-k', help='SSH private key path')
    parser.add_argument('--output', '-o', default='inventory.json', help='Output JSON file')
    
    args = parser.parse_args()
    
    collector = OSInventoryCollector(
        ssh_host=args.host,
        ssh_port=args.port,
        ssh_user=args.user,
        ssh_key_path=args.key
    )
    
    if collector.collect_all():
        collector.save_inventory(args.output)
        collector.print_summary()
        print(f"\n✅ Inventory collection complete for {args.host}")
        return 0
    else:
        print(f"\n❌ Failed to collect inventory from {args.host}")
        return 1

if __name__ == "__main__":
    sys.exit(main())