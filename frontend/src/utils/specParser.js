/**
 * specParser.js — Parse Huawei Cloud resource spec strings into structured fields.
 * Matches the quotation format: flavor → vCPUs, RAM, disk type/size, OS, bandwidth.
 */

/**
 * Parse a compute flavor string like "Flexus X | x0.2u.4g | 2vCPUs | 4GB"
 * or "s6.large.2" into { vcpu, ram_gb, flavorName, category }
 */
export function parseComputeSpec(item) {
  const result = {
    vcpu: null, ram_gb: null, disk_gb: null, disk_type: null,
    os_type: null, bandwidth_mbps: null, flavorName: null,
    category: 'compute'
  };

  const flavor = item.flavor || item.type || '';
  const specStr = item.specification || item.spec || '';

  // Try exact patterns first (e.g. "2vCPUs | 4GB")
  const vcpuMatch = (flavor + '|' + specStr).match(/(\d+)\s*vCPU/i);
  if (vcpuMatch) result.vcpu = parseInt(vcpuMatch[1]);

  const ramMatch = (flavor + '|' + specStr).match(/(\d+)\s*GB\s*(RAM|Memory)?/i);
  if (ramMatch) result.ram_gb = parseInt(ramMatch[1]);

  // Try dot notation (e.g. "x0.2u.4g" → 0.2 vCPU? 4GB RAM)
  // Actually "u" = unit (vCPU), "g" = GB RAM
  const ugMatch = flavor.match(/(\d+)\s*u\s*\.?\s*(\d+)\s*g/i);
  if (ugMatch && !result.vcpu) {
    result.vcpu = parseInt(ugMatch[1]);
    result.ram_gb = parseInt(ugMatch[2]);
  }

  // Try s6/c6/t6 flavor patterns
  // s6.large.2 → 2 vCPUs, ~4GB RAM (large=4GB)
  // c6.xlarge.4 → 4 vCPUs, ~8GB RAM (xlarge=8GB)
  if (!result.vcpu || !result.ram_gb) {
    const flavorParts = flavor.match(/[sct]\d+\.(\w+)\.(\d+)/i);
    if (flavorParts) {
      const size = flavorParts[1].toLowerCase().replace('2xlarge', '2xlarge');
      const multi = parseInt(flavorParts[2]) || 1;
      const sizeMap = {
        'micro': 1, 'small': 1, 'medium': 1, 'large': 2, 'xlarge': 4,
        '2xlarge': 8, '4xlarge': 16, '8xlarge': 32, '16xlarge': 64
      };
      const baseVcpu = sizeMap[size] || 2;
      result.vcpu = baseVcpu * multi;
      // RAM: ~2GB per vCPU for general purpose, ~4GB for compute-optimized
      const ramPerVcpu = flavor.startsWith('c') ? 2 : 2;
      result.ram_gb = result.vcpu * ramPerVcpu;
    }
  }

  // Disk info from type or spec string
  const diskMatch = (item.type + '|' + specStr).match(/(\d+)\s*GB\s*(SSD|SAS|SATA|General\s*Purpose|Cloud|High\s*IO)/i);
  if (diskMatch) {
    result.disk_gb = parseInt(diskMatch[1]);
    result.disk_type = diskMatch[2];
  }

  // OS from image or type field
  if (item.os_type || item.image || item.os) {
    result.os_type = item.os_type || item.image || item.os;
  } else if (item.type && /(AlmaLinux|CentOS|Ubuntu|Windows|Debian|Red\s*Hat|SUSE)/i.test(item.type)) {
    result.os_type = item.type.match(/(AlmaLinux|CentOS|Ubuntu|Windows|Debian|Red\s*Hat|SUSE)[^|]*/i)?.[0]?.trim();
  }

  // Bandwidth
  if (item.bandwidth) {
    const bwMatch = String(item.bandwidth).match(/(\d+)\s*Mbps|(\d+)M|(\d+)\s*TB/i);
    if (bwMatch) {
      result.bandwidth_mbps = bwMatch[1] ? parseInt(bwMatch[1]) : null;
      if (bwMatch[3]) result.bandwidth_mbps = parseInt(bwMatch[3]) * 1000000; // TB→Mbps rough
    }
  }

  result.flavorName = flavor;
  return result;
}

/**
 * Parse an RDS/database spec like "MySQL | 8.0 | Primary/Standby | 2vCPUs, 8GB"
 */
export function parseDatabaseSpec(item) {
  const result = {
    engine: null, version: null, mode: null, vcpu: null, ram_gb: null,
    disk_gb: null, disk_type: null, category: 'databases'
  };

  // Direct fields from enhanced backend discovery (preferred)
  if (item.vcpu) result.vcpu = typeof item.vcpu === 'string' ? parseInt(item.vcpu) : item.vcpu;
  if (item.ram_gb) result.ram_gb = typeof item.ram_gb === 'string' ? parseFloat(item.ram_gb) : item.ram_gb;
  if (item.engine) result.engine = item.engine;
  if (item.version) result.version = item.version;
  if (item.disk_gb) result.disk_gb = typeof item.disk_gb === 'string' ? parseInt(item.disk_gb) : item.disk_gb;
  if (item.disk_type) result.disk_type = item.disk_type;

  // Fallback: parse from text fields if direct fields unavailable
  const type = item.type || item.engine || '';
  const flavor = item.flavor || '';
  const storageItem = item.storage || item;

  // Engine from type string
  const engineMatch = type.match(/(MySQL|PostgreSQL|GaussDB|SQL\s*Server|MariaDB|MongoDB|RDS|DDS)/i);
  if (engineMatch && !result.engine) result.engine = engineMatch[1];

  const versionMatch = type.match(/(\d+\.\d+)/);
  if (versionMatch && !result.version) result.version = versionMatch[1];

  if (/Primary\/Standby|Single|Cluster|Replica|HA/i.test(type) && !result.mode)
    result.mode = type.match(/Primary\/Standby|Single|Cluster|Replica|HA/i)[0];

  // vCPU/RAM from text
  const vcpuMatch = (type + '|' + flavor).match(/(\d+)\s*vCPU/i);
  if (vcpuMatch && !result.vcpu) result.vcpu = parseInt(vcpuMatch[1]);

  const ramMatch = (type + '|' + flavor).match(/(\d+)\s*GB/i);
  if (ramMatch && !result.ram_gb) result.ram_gb = parseInt(ramMatch[1]);

  // Storage from text
  const diskMatch = (storageItem.type + '|' + (storageItem.spec || '')).match(/(\d+)\s*GB\s*(SSD|SAS|Cloud)/i);
  if (diskMatch) {
    if (!result.disk_gb) result.disk_gb = parseInt(diskMatch[1]);
    if (!result.disk_type) result.disk_type = diskMatch[2];
  }

  // Ultimate fallback: use raw type as engine if nothing was found
  if (!result.engine && item.type) result.engine = item.type;

  return result;
}

/**
 * Parse an EIP/network spec like "Dedicated | Dynamic BGP | Traffic | 1TB"
 */
export function parseNetworkSpec(item) {
  const result = {
    type: null, eip_count: 1, bandwidth_mbps: null, traffic_tb: null,
    category: 'network'
  };

  const type = item.type || '';
  const bandwidth = item.bandwidth || '';

  if (/Dynamic\s*BGP|Static\s*BGP/i.test(type))
    result.type = type.match(/Dynamic\s*BGP|Static\s*BGP/i)[0];

  const bwMatch = bandwidth.match(/(\d+)\s*Mbps|(\d+)M/);
  if (bwMatch) result.bandwidth_mbps = parseInt(bwMatch[1] || bwMatch[2]);

  const trafficMatch = (type + '|' + bandwidth).match(/(\d+)\s*(TB|GB)\s*Traffic/i);
  if (trafficMatch) {
    const val = parseInt(trafficMatch[1]);
    result.traffic_tb = trafficMatch[2] === 'TB' ? val : val / 1000;
  }

  return result;
}

/**
 * Parse a storage (OBS/CBR) spec like "Server backup vault | 1024GB"
 */
export function parseStorageSpec(item) {
  const result = {
    type: null, size_gb: null, category: 'storage'
  };

  const type = item.type || '';
  const vtype = item.vault_type || item.type || '';

  if (/backup|recovery|vault/i.test(vtype))
    result.type = vtype.match(/[^|]*backup[^|]*|.*vault[^|]*/i)?.[0]?.trim() || vtype;
  else if (/OBS|Object\s*Storage/i.test(type))
    result.type = 'OBS';

  const sizeMatch = (type + '|' + (item.size || '')).match(/(\d+)\s*GB|(\d+)\s*TB/i);
  if (sizeMatch) {
    result.size_gb = sizeMatch[2] ? parseInt(sizeMatch[1]) * 1024 : parseInt(sizeMatch[1]);
  }

  return result;
}

/**
 * Parse a security (WAF/HSS) spec
 */
export function parseSecuritySpec(item) {
  const result = {
    type: null, edition: null, category: 'security'
  };

  const type = item.type || '';
  if (/WAF|Web\s*Application\s*Firewall/i.test(type))
    result.type = 'WAF';
  else if (/Host\s*Security|HSS/i.test(type))
    result.type = 'Host Security Service';
  else if (/Shield|Anti-DDoS/i.test(type))
    result.type = 'Anti-DDoS';

  if (/Premium|Standard|Enterprise|Basic/i.test(type))
    result.edition = type.match(/Premium|Standard|Enterprise|Basic/i)[0];

  return result;
}

/**
 * Main entry: parse any resource item and return structured specs + a formatted display string.
 */
export function parseResourceSpec(item, category = 'compute') {
  let parsed;
  const cat = category?.toLowerCase?.() || 'compute';

  if (cat.includes('comput') || cat.includes('ecs') || cat.includes('server'))
    parsed = parseComputeSpec(item);
  else if (cat.includes('data') || cat.includes('rds') || cat.includes('sql') || cat.includes('gauss'))
    parsed = parseDatabaseSpec(item);
  else if (cat.includes('net') || cat.includes('eip') || cat.includes('vpc') || cat.includes('nat') || cat.includes('elb') || cat.includes('cdn'))
    parsed = parseNetworkSpec(item);
  else if (cat.includes('stor') || cat.includes('obs') || cat.includes('cbr') || cat.includes('backup'))
    parsed = parseStorageSpec(item);
  else if (cat.includes('sec') || cat.includes('waf') || cat.includes('shield') || cat.includes('hss'))
    parsed = parseSecuritySpec(item);
  else
    parsed = parseComputeSpec(item); // fallback to compute

  // Build display string matching quotation format
  parsed.displayStr = buildDisplayString(parsed, cat);
  return parsed;
}

function buildDisplayString(p, cat) {
  const parts = [];
  const c = (cat || '').toLowerCase();

  // Compute: "x0.2u.4g | 2vCPUs | 4GB"
  if (c.includes('comput') || c.includes('ecs') || c.includes('server')) {
    if (p.flavorName) parts.push(p.flavorName);
    if (p.vcpu) parts.push(`${p.vcpu}vCPUs`);
    if (p.ram_gb) parts.push(`${p.ram_gb}GB RAM`);
    if (p.disk_type && p.disk_gb) parts.push(`${p.disk_type} ${p.disk_gb}GB`);
    else if (p.disk_gb) parts.push(`${p.disk_gb}GB Disk`);
    if (p.os_type) parts.push(p.os_type);
    if (p.bandwidth_mbps) parts.push(`${p.bandwidth_mbps}Mbps`);
  }
  // Database: "MySQL 8.0 | 2vCPUs, 8GB | Cloud SSD 150GB"
  else if (c.includes('data') || c.includes('rds') || c.includes('sql') || c.includes('gauss')) {
    let eng = p.engine || '';
    if (p.version) eng += ` ${p.version}`;
    if (p.mode) eng += ` ${p.mode}`;
    if (eng) parts.push(eng);
    if (p.vcpu && p.ram_gb) parts.push(`${p.vcpu}vCPUs, ${p.ram_gb}GB`);
    if (p.disk_type && p.disk_gb) parts.push(`${p.disk_type} ${p.disk_gb}GB`);
  }
  // Network: "Dynamic BGP | 1TB Traffic"
  else if (c.includes('net') || c.includes('eip') || c.includes('vpc') || c.includes('nat') || c.includes('elb') || c.includes('cdn')) {
    if (p.type) parts.push(p.type);
    if (p.bandwidth_mbps) parts.push(`${p.bandwidth_mbps}Mbps`);
    if (p.traffic_tb) parts.push(`${p.traffic_tb}TB Traffic`);
  }
  // Storage: "Server backup vault 1024GB"
  else if (c.includes('stor') || c.includes('obs') || c.includes('cbr') || c.includes('backup')) {
    if (p.type) parts.push(p.type);
    if (p.size_gb) parts.push(`${p.size_gb}GB`);
  }
  // Security: "WAF Premium"
  else if (c.includes('sec') || c.includes('waf') || c.includes('shield') || c.includes('hss')) {
    if (p.type) parts.push(p.type);
    if (p.edition) parts.push(p.edition);
  }
  else {
    if (p.flavorName) parts.push(p.flavorName);
    if (p.vcpu) parts.push(`${p.vcpu}vCPU`);
    if (p.ram_gb) parts.push(`${p.ram_gb}GB`);
  }

  return parts.join(' | ') || '—';
}
