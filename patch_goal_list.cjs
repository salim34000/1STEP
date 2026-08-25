const fs = require('fs');
let code = fs.readFileSync('src/components/GoalListView.tsx', 'utf8');

code = code.replace(
  `      </div>

      {/* Filter Tabs */}`,
  `      </div>

      <ChallengeWidget />

      {/* Filter Tabs */}`
);

fs.writeFileSync('src/components/GoalListView.tsx', code);
