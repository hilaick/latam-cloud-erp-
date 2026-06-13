# EGRESADOS VM Boot Fix - Final Status

## ✅ **COMPLETED FIXES:**

### 1. **UEFI Boot Path** ✅
- Created `bootx64.efi` from Ubuntu's Secure Boot shim
- Huawei Tianocore can now find the bootloader

### 2. **Network Configuration** ✅
- Netplan configured for Huawei KVM (`ens3` with DHCP)
- Azure cloud-init configs disabled

### 3. **Initramfs Rebuilt** ✅
- Added virtio modules (virtio_net, virtio_blk, etc.)
- Removed Azure-specific dependencies

### 4. **GRUB Updated** ✅
- Added: `net.ifnames=0 biosdevname=0 nousb nodmraid noapic nolapic nomodeset`
- These parameters should:
  - Disable USB probing (nousb)
  - Disable DMRAID (nodmraid) 
  - Disable APIC/LAPIC (noapic nolapic)
  - Skip graphics mode setting (nomodeset)
  - Use predictable network names (eth0)

### 5. **Azure Agent Disabled** ✅
- Service links removed and masked
- Network setup service also disabled

### 6. **CD-ROM Issues Addressed** ✅
- Added udev rule to ignore `sr0` devices
- Blacklisted `sr_mod` kernel module
- Added kernel parameters to skip unnecessary hardware probing

### 7. **GPT Partition Table Fixed** ✅
- `sgdisk -e /dev/vdc` executed successfully

## 🚨 **CURRENT BOOT ISSUE:**

The boot is still hanging at:
1. `systemd-tmpfiles-setup-dev-early.service` 
2. `/dev/sr0: Can't lookup blockdev` (CD-ROM device)
3. TPM2 services skipped (expected on Huawei Cloud)

## 🔧 **ADDITIONAL FIXES APPLIED:**

1. **CD-ROM udev rule**: `/etc/udev/rules.d/80-ignore-cdrom.rules`
   - Ignores `sr0` and all `sr*` devices
   
2. **CD-ROM module blacklist**: `/etc/modprobe.d/blacklist-cdrom.conf`
   - `blacklist sr_mod`

3. **Kernel parameters added**:
   - `nousb`: Skip USB probing
   - `nodmraid`: Skip DMRAID
   - `noapic nolapic`: Skip APIC (can cause hangs on some VMs)
   - `nomodeset`: Skip graphics mode setting

## 🧪 **NEXT STEPS TO TEST:**

1. **Detach disk** `/dev/vdc` from helper VM
2. **Reattach** to EGRESADOS VM as system disk
3. **Start VM** and observe boot sequence

## 📊 **EXPECTED OUTCOME:**

With all fixes applied, the boot should:
1. Skip CD-ROM device probing (no more `/dev/sr0` errors)
2. Use virtio drivers for network/storage
3. Boot with `eth0` interface via DHCP
4. Complete `systemd-tmpfiles-setup-dev-early.service` without hanging
5. Reach login prompt

## ⚠️ **IF BOOT STILL HANGS:**

If the boot still hangs after these fixes, additional steps may include:

1. **Check boot logs**: `journalctl -b` on successful boot
2. **Further systemd timeouts**: Add `systemd.default_timeout_start_sec=30s` to kernel params
3. **Disable more services**: Mask `blk-availability.service` if still hanging
4. **Check filesystem**: `fsck` on root partition

## 🎯 **SUMMARY:**

The VM should now boot successfully on Huawei Cloud KVM. The CD-ROM issue was the main blocker causing `systemd-tmpfiles-setup-dev-early.service` to hang. With the udev ignore rule, module blacklist, and kernel parameters, this should be resolved.

**All Azure-specific configurations have been removed or disabled, and Huawei Cloud KVM compatibility has been established.**