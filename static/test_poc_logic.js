// Test if PoC project detection works
console.log("=== PoC Project Test ===");

// Simulate the project data
const pocProject = {
    id: 4,
    name: "Fast-Track PoC: E-Commerce Platform",
    project_type: "poc",
    pocCap: 500,
    pocTtl: "2026-06-30",
    lifecycleState: "2_architecture"
};

const regularProject = {
    id: 1,
    name: "AWS Data Lake Exit",
    lifecycleState: "4_execution"
};

// Test PoC detection
const isPoC1 = pocProject?.project_type === "poc";
const isPoC2 = regularProject?.project_type === "poc";

console.log("PoC Project detection:", isPoC1 ? "✅ PASS" : "❌ FAIL");
console.log("Regular Project detection:", isPoC2 ? "❌ FAIL (should be false)" : "✅ PASS");

// Test phase arrays
const statesPoC = isPoC1 
    ? ['1_arb', '2_architecture', '3_planning', '4_execution']
    : ['1_arb', '2_architecture', '3_planning', '4_execution', '5_postlive'];
    
const statesRegular = isPoC2 
    ? ['1_arb', '2_architecture', '3_planning', '4_execution']
    : ['1_arb', '2_architecture', '3_planning', '4_execution', '5_postlive'];

console.log("PoC phases:", statesPoC.length, "phases:", statesPoC);
console.log("Regular phases:", statesRegular.length, "phases:", statesRegular);

// Test banner logic
if (isPoC1) {
    console.log("✅ PoC banner should show: 'Fast-Track PoC Lifecycle Active'");
} else {
    console.log("❌ PoC banner should NOT show");
}

console.log("=== Test Complete ===");