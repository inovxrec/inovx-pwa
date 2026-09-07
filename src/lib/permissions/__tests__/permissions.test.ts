import {
  resolveEffectivePermission,
  getEffectivePermissionList,
  formatEffectivePreview,
  computePermissionDiff,
} from '../resolver';
import { can, type Session } from '../../../store/authStore';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

console.log('=== RUNNING STREAM B PERMISSIONS TEST SUITE ===\n');

// 1. Base Role Default Templates
console.log('1. Base Role Default Templates');
assert(
  resolveEffectivePermission('member', undefined, 'task.create') === true,
  'Member can create tasks by default'
);
assert(
  resolveEffectivePermission('member', undefined, 'task.approve') === false,
  'Member CANNOT approve completions by default'
);
assert(
  resolveEffectivePermission('admin', undefined, 'task.approve') === true,
  'Admin can approve completions by default'
);
assert(
  resolveEffectivePermission('faculty', undefined, 'oversight.view') === true,
  'Faculty has oversight.view permission by default'
);
assert(
  resolveEffectivePermission('faculty', undefined, 'task.create') === false,
  'Faculty does NOT have task.create by default (read-only oversight)'
);
assert(
  resolveEffectivePermission('super_admin', undefined, 'permissions.manage') === true,
  'Super Admin has permissions.manage by default'
);

// 2. Tri-State Granular Overrides Tests
console.log('\n2. Tri-State Overrides (Grant / Revoke / Inherit)');
// Test A: Delegated domain lead approval (FR-TASK-9)
const memberWithGrant = { 'task.approve': 'grant' as const };
assert(
  resolveEffectivePermission('member', memberWithGrant, 'task.approve') === true,
  'Grant override enables task.approve for plain member (FR-TASK-9)'
);

// Test B: Revoke override on admin
const adminWithRevoke = { 'recurring.manage': 'revoke' as const };
assert(
  resolveEffectivePermission('admin', adminWithRevoke, 'recurring.manage') === false,
  'Revoke override disables recurring.manage for admin'
);

// Test C: Inherit keeps base default
const memberWithInherit = { 'task.create': 'inherit' as const };
assert(
  resolveEffectivePermission('member', memberWithInherit, 'task.create') === true,
  'Inherit keeps member default for task.create'
);

// 3. Live Effective Preview Tests (FR-ROLE-2)
console.log('\n3. Live Effective Preview (FR-ROLE-2)');
const preview = formatEffectivePreview('member', { 'task.approve': 'grant' as const });
assert(
  preview.includes('APPROVE COMPLETIONS'),
  'Effective preview includes explicitly granted "APPROVE COMPLETIONS"'
);
assert(
  preview.includes('CREATE TASKS'),
  'Effective preview includes inherited "CREATE TASKS"'
);

// 4. Permission Diff Computation (FR-ROLE-3)
console.log('\n4. Permission Diff & Audit Logging (FR-ROLE-3)');
const diff = computePermissionDiff('member', {
  'task.approve': 'grant' as const,
  'board.view.all': 'grant' as const,
  'task.create': 'inherit' as const,
});
assert(
  diff.granted.includes('task.approve') && diff.granted.includes('board.view.all'),
  'Diff correctly identifies newly granted permissions'
);

// 5. Client Session can() Helper Tests
console.log('\n5. Client Session can() Helper');
const memberSession: Session = {
  userId: 'usr_riya',
  name: 'Riya Sen',
  initials: 'RS',
  role: 'member',
  permissions: { 'task.approve': true },
};
assert(
  can(memberSession, 'task.approve') === true,
  'can() helper respects hydrated session permissions'
);
assert(
  can(memberSession, 'task.delete') === false,
  'can() helper denies unauthorized actions for member'
);

const superAdminSession: Session = {
  userId: 'usr_varun',
  name: 'Varun Sharma',
  initials: 'VS',
  role: 'super_admin',
};
assert(
  can(superAdminSession, 'permissions.manage') === true,
  'can() helper permits super_admin to manage permissions'
);

// 6. Complete Effective Permission List
console.log('\n6. Effective Permission List Resolution');
const list = getEffectivePermissionList('faculty', undefined);
assert(
  list.includes('oversight.view') && list.includes('task.view.all') && !list.includes('task.create'),
  'getEffectivePermissionList returns expected permissions for faculty'
);

// Summary
console.log(`\n==============================================`);
console.log(`TEST RESULTS: ${passed} Passed, ${failed} Failed`);
console.log(`==============================================\n`);

if (failed > 0) {
  throw new Error(`Test suite failed: ${failed} tests failed`);
}
