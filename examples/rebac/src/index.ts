import { alice, bob, charlie, doc1, doc2, doc3 } from './data.js'
import { permix, setupForUser } from './permix'

function assert(label: string, actual: boolean, expected: boolean) {
  const status = actual === expected ? 'PASS' : 'FAIL'
  console.log(`  [${status}] ${label}: ${actual} (expected ${expected})`)
  if (actual !== expected)
process.exitCode = 1
}

// --- Scenario 1: Ownership ---
console.log('\n--- Scenario 1: Ownership ---')
console.log('Alice owns doc-1')
setupForUser(alice)

assert('alice can read doc-1', permix.check('doc.read', doc1), true)
assert('alice can update doc-1', permix.check('doc.update', doc1), true)
assert('alice can admin doc-1', permix.check('doc.admin', doc1), true)
assert('alice cannot update doc-2 (bob owns it)', permix.check('doc.update', doc2), false)

// --- Scenario 2: Team membership ---
console.log('\n--- Scenario 2: Team membership ---')
console.log('Bob is in team-a, doc-1 belongs to team-a')
setupForUser(bob)

assert('bob can read doc-1 (same team)', permix.check('doc.read', doc1), true)
assert('bob cannot update doc-1 (not owner)', permix.check('doc.update', doc1), false)
assert('bob cannot read doc-3 (different team)', permix.check('doc.read', doc3), false)

// --- Scenario 3: Document sharing ---
console.log('\n--- Scenario 3: Document sharing ---')
console.log('Charlie has "write" share on doc-2, "no share" on doc-1')
setupForUser(charlie)

assert('charlie cannot read doc-1 (no relation)', permix.check('doc.read', doc1), false)
assert('charlie can read doc-2 (write >= read)', permix.check('doc.read', doc2), true)
assert('charlie can update doc-2 (write share)', permix.check('doc.update', doc2), true)
assert('charlie cannot admin doc-2 (write < admin)', permix.check('doc.admin', doc2), false)

console.log('Alice has "read" share on doc-3')
setupForUser(alice)

assert('alice can read doc-3 (read share)', permix.check('doc.read', doc3), true)
assert('alice cannot update doc-3 (read < write)', permix.check('doc.update', doc3), false)

// --- Composite check ---
console.log('\n--- Composite check ---')
setupForUser(alice)
assert(
  'alice can read OR admin doc-1 (callback)',
  permix.check(c => c('doc.read', doc1) || c('doc.admin', doc1)),
  true,
)
assert(
  'alice can read AND admin doc-1 (callback)',
  permix.check(c => c('doc.read', doc1) && c('doc.admin', doc1)),
  true,
)

console.log('\nDone.')
