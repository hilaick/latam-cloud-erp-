// Main Physics Engine View - Orchestrates all components
// Main Physics Engine View - Orchestrates all components
// Uses global React from CDN

function PhysicsEngineView({ activeProject, onUpdateProject }) {
    const { useState, useEffect, useMemo } = React;
    
    // 1. Compute & Encryption
    const [computeCPU, setComputeCPU] = useState(60); 
    const [computeRAM, setComputeRAM] = useState(60);
    const [computeOS, setComputeOS] = useState('Linux');
    const [sourceEncrypted, setSourceEncrypted] = useState(false);
    
    // 2. Payload, Unit & Files
    const [storageSize, setStorageSize] = useState(5.0); 
    const [storageUnit, setStorageUnit] = useState('TB');
    const [storageMode, setStorageMode] = useState('Block'); // Block/File vs Object
    const [diskType, setDiskType] = useState('SSD');
    const [targetKMS, setTargetKMS] = useState(false);
    
    const [totalFiles, setTotalFiles] = useState(103000000); 
    const [smallFiles, setSmallFiles] = useState(90000000); 
    const [syncMethod, setSyncMethod] = useState('Block'); 
    
    // 3. Database
    const [excludeDb, setExcludeDb] = useState(true); 
    const [dbStorageSize, setDbStorageSize] = useState(4.0);
    const [dbType, setDbType] = useState('PostgreSQL'); 
    const [dbRowsM, setDbRowsM] = useState(250); 
    const [dbRps, setDbRps] = useState(8000);
    
    // 4. Network Routing (Standard)
    const [netSource, setNetSource] = useState(1000); 