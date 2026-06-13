# EGRESADOS Ubuntu VM Boot Fix - Complete Solution

## Root Cause Analysis:
The Ubuntu VM from Azure was failing to boot on Huawei Cloud KVM because:

1. **Azure-specific kernel modules** (`hv_netvsc`, `hyperv_fb`) in initramfs
2. **Network interface naming**: Azure uses predictable names, Huawei uses `ens3`
3. **UEFI boot path**: Huawei Tianocore expects `bootx64.efi` (lowercase)
4. **Cloud-init Azure configs** interfering with boot
5. **GPT partition table misalignment**

## Fixes Applied:

### 1. **UEFI Boot Path Fixed** ✅
- Renamed `BOOTX64.EFI` (Windows EFI) to `BOOTX64.EFI.bak`
- Copied Ubuntu's Secure Boot shim: `cp ../ubuntu/shimx64.efi bootx64.efi`
- Huawei Tianocore now finds the correct bootloader

### 2. **Network Configuration Fixed** ✅
- **Original**: Azure-specific Netplan with `hv_netvsc` driver and MAC binding
- **Fixed**: Generic Huawei KVM config with `ens3` interface
- **File**: `/etc/netplan/01-netcfg.yaml`
- **Disabled**: Azure cloud-init configs (`90-azure.cfg.disabled`, `10-azure-kvp.cfg.disabled`)

### 3. **Initramfs Rebuilt with VirtIO Modules** ✅
- **Added**: `virtio`, `virtio_pci`, `virtio_net`, `virtio_blk`, `virtio_ring`, etc.
- **Removed**: Azure-specific module dependencies
- **Command**: `update-initramfs -u -k all`

### 4. **GRUB Kernel Parameters Updated** ✅
- **Added**: `net.ifnames=0 biosdevname=0` to GRUB_CMDLINE_LINUX
- **Result**: Uses predictable network interface names (`eth0` instead of `ens3`)
- **Command**: `update-grub`

### 5. **GPT Partition Table Fixed** ✅
- **Issue**: "GPT PMBR size mismatch" and backup GPT not at end of disk
- **Fix**: `sgdisk -e /dev/vdc` to relocate backup partition table
- **Result**: "No problems found" after fix

### 6. **Filesystem Structure Verified** ✅
- EFI System Partition: `/dev/vdc15` (106M, FAT32) → `/boot/efi`
- Boot Partition: `/dev/vdc16` (913M, ext4) → `/boot`
- Root Partition: `/dev/vdc1` (63G, ext4) → `/`
- fstab correctly configured

## Verification Steps:

1. **Check GPT status**: `sgdisk -v /dev/vdc` → "No problems found"
2. **Check EFI structure**: `ls -la /boot/efi/EFI/BOOT/` → `bootx64.efi` present
3. **Check initramfs modules**: `lsinitramfs /boot/initrd.img* | grep virtio`
4. **Check GRUB config**: `cat /etc/default/grub` → has `net.ifnames=0 biosdevname=0`

## Next Steps:

1. **Detach the disk** (`/dev/vdc`) from helper VM in Huawei Cloud console
2. **Reattach it** to EGRESADOS VM as system disk
3. **Start the EGRESADOS VM**
4. **Expected boot sequence**:
   - Huawei Tianocore finds `bootx64.efi`
   - GRUB loads with virtio modules
   - Kernel boots with `net.ifnames=0` (uses `eth0`)
   - Network comes up via DHCP
   - System reaches login prompt

## Files Modified:
1. `/boot/efi/EFI/BOOT/bootx64.efi` - Created from shimx64.efi
2. `/boot/efi/EFI/BOOT/BOOTX64.EFI.bak` - Backup of original
3. `/etc/netplan/01-netcfg.yaml` - Huawei-compatible network config
4. `/etc/netplan/50-cloud-init.yaml.disabled` - Disabled Azure config
5. `/etc/netplan/90-azure.cfg.disabled` - Disabled Azure cloud-init
6. `/etc/netplan/10-azure-kvp.cfg.disabled` - Disabled Azure KVP
7. `/etc/initramfs-tools/modules` - Added virtio modules
8. `/etc/default/grub` - Added `net.ifnames=0 biosdevname=0`
9. `/boot/initrd.img-6.17.0-1017-azure` - Rebuilt with virtio
10. `/boot/initrd.img-6.14.0-1014-azure` - Rebuilt with virtio

The VM should now boot successfully on Huawei Cloud KVM infrastructure.