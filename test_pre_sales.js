// Simulate the frontend logic with test data
const testProjects = [
  {
    id: 'test-timeline-001',
    name: 'TIMELINE TEST PROJECT',
    isWaiting: true,
    waitingStage: 'ready',
    lifecycleState: '1_arb',
    estimatedStartDate: '2024-07-01',
    estimatedDurationWeeks: '6',
    sa: 'Test SA',
    health: 'Yellow',
    mrr: 5000,
    country: 'Panama'
  },
  {
    id: '1781560912861',
    name: 'APP_1',
    isWaiting: true,
    waitingStage: 'sizing',
    lifecycleState: '1_arb',
    estimatedStartDate: null,
    estimatedDurationWeeks: null,
    sa: 'Test SA',
    health: 'Green',
    mrr: 10000,
    country: 'Chile'
  },
  {
    id: '1779749367461',
    name: 'Grupo MELO',
    isWaiting: true,
    waitingStage: 'ready',
    lifecycleState: 'archived',
    estimatedStartDate: null,
    estimatedDurationWeeks: null,
    sa: 'Test SA',
    health: 'Red',
    mrr: 15000,
    country: 'Brazil'
  }
];

function getIsWaiting(obj) {
  const val = obj.isWaiting;
  return val === true || val === 'true' || val === 'True' || val === 1 || val === '1';
}

const phaseFilter = 'All';
const viewMode = 'gantt';

const timelineProjects = [];
(testProjects || []).forEach(p => {
  if (!p) return;
  
  const isWaiting = getIsWaiting(p) || (p.data && getIsWaiting(p.data));
  console.log(`Project: ${p.name}, isWaiting: ${isWaiting}, lifecycleState: ${p.lifecycleState}`);
  
  // Filter by phase if not "All"
  if (phaseFilter !== 'All' && phaseFilter !== 'pre_sales') {
    if (p.lifecycleState !== phaseFilter && !isWaiting) {
      console.log(`  Skipped: lifecycleState ${p.lifecycleState} !== ${phaseFilter} and not pre-sales`);
      return;
    }
  }
  // If filter is 'pre_sales', only show pre-sales projects
  if (phaseFilter === 'pre_sales' && !isWaiting) {
    console.log(`  Skipped: pre_sales filter but isWaiting=false`);
    return;
  }
  
  // FOR PRE-SALES PROJECTS (isWaiting = true)
  if (isWaiting) {
    const waitingStage = p.waitingStage || (p.data && p.data.waitingStage);
    const estimatedStartDate = p.estimatedStartDate || (p.data && p.data.estimatedStartDate);
    const estimatedDurationWeeks = p.estimatedDurationWeeks || (p.data && p.data.estimatedDurationWeeks) || '4';
    
    let startDate = null;
    let endDate = null;
    
    if (estimatedStartDate) {
      startDate = new Date(estimatedStartDate);
      console.log(`  Using estimatedStartDate: ${estimatedStartDate}, parsed: ${startDate}`);
    } else {
      const today = new Date();
      const weeksOut = waitingStage === 'prospect' ? 10 :
                      waitingStage === 'sizing' ? 6 :
                      waitingStage === 'ready' ? 2 :
                      8;
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() + (weeksOut * 7));
      console.log(`  Calculated start date from waitingStage ${waitingStage}: ${startDate}`);
    }
    
    const durationWeeks = parseInt(estimatedDurationWeeks);
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (durationWeeks * 7));
    
    timelineProjects.push({
      ...p,
      startObj: startDate,
      endObj: endDate,
      targetNodes: 0,
      kickoffStr: estimatedStartDate || 'TBD',
      targetStr: 'TBD',
      isPreSales: true,
      timelineType: 'estimated',
      estimatedDurationWeeks: estimatedDurationWeeks,
      waitingStage: waitingStage || 'unknown'
    });
    
    console.log(`  Added as pre-sales project`);
  }
});

console.log(`\nTotal timelineProjects: ${timelineProjects.length}`);
timelineProjects.forEach(p => {
  console.log(`- ${p.name}: ${p.waitingStage}, start: ${p.startObj}, end: ${p.endObj}`);
});
