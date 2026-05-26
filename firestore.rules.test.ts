/**
 * Dirty-dozen Firestore rules tests.
 *
 * Run against the local Firestore emulator:
 *   firebase emulators:start --only firestore
 *   npm run test:rules
 *
 * Each case maps to security_spec.md.
 */
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { doc, setDoc, getDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';

const PROJECT_ID = 'ocean-rules-test';
const ALICE = 'alice-uid';
const BOB = 'bob-uid';

let env: RulesTestEnvironment;

function aliceCtx() {
  return env.authenticatedContext(ALICE, { email_verified: true } as any).firestore();
}
function bobCtx() {
  return env.authenticatedContext(BOB, { email_verified: true } as any).firestore();
}
function anonCtx() {
  return env.unauthenticatedContext().firestore();
}

const validWorkspace = (ownerId: string, createdAt = Date.now()) => ({
  name: 'Alice WS',
  ownerId,
  createdAt,
  type: 'blog',
  icon: '',
});

const validPage = (ownerId: string, workspaceId: string) => ({
  workspaceId,
  parentId: '',
  title: 'Hello',
  icon: '',
  coverImage: '',
  order: 'a0',
  timestamp: Date.now(),
  deleted: false,
  published: false,
  ownerId,
});

const validBlock = (ownerId: string) => ({
  type: 'text',
  order: 'a0',
  parentId: '',
  content: 'hi',
  attrs: {},
  ownerId,
});

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

async function seedAliceWorkspace(wsId = 'ws_alice') {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'workspaces', wsId), validWorkspace(ALICE));
  });
  return wsId;
}

describe('Dirty dozen', () => {
  it('1. Identity spoofing: create workspace with foreign ownerId', async () => {
    const db = aliceCtx();
    await assertFails(
      setDoc(doc(db, 'workspaces', 'ws1'), validWorkspace(BOB))
    );
  });

  it('2. Privilege escalation: update workspace ownerId to someone else', async () => {
    const wsId = await seedAliceWorkspace();
    const db = aliceCtx();
    await assertFails(
      updateDoc(doc(db, 'workspaces', wsId), { ownerId: BOB })
    );
  });

  it('3. Cross-workspace write: create page in another user\'s workspace', async () => {
    const wsId = await seedAliceWorkspace();
    const db = bobCtx();
    await assertFails(
      setDoc(doc(db, 'workspaces', wsId, 'pages', 'p1'), validPage(BOB, wsId))
    );
  });

  it('4. Cross-workspace write: add block to another user\'s page', async () => {
    const wsId = await seedAliceWorkspace();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'workspaces', wsId, 'pages', 'p1'), validPage(ALICE, wsId));
    });
    const db = bobCtx();
    await assertFails(
      setDoc(doc(db, 'workspaces', wsId, 'pages', 'p1', 'blocks', 'b1'), validBlock(BOB))
    );
  });

  it('5. Missing ownerId on workspace create', async () => {
    const db = aliceCtx();
    const { ownerId, ...withoutOwner } = validWorkspace(ALICE);
    await assertFails(
      setDoc(doc(db, 'workspaces', 'ws_bad'), withoutOwner as any)
    );
  });

  it('6. Value poisoning: deleted as non-boolean', async () => {
    const wsId = await seedAliceWorkspace();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'workspaces', wsId, 'pages', 'p1'), validPage(ALICE, wsId));
    });
    const db = aliceCtx();
    await assertFails(
      updateDoc(doc(db, 'workspaces', wsId, 'pages', 'p1'), { deleted: 'yes' as any })
    );
  });

  it('7. Resource poisoning: oversized block content', async () => {
    const wsId = await seedAliceWorkspace();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'workspaces', wsId, 'pages', 'p1'), validPage(ALICE, wsId));
    });
    const db = aliceCtx();
    const huge = 'x'.repeat(20_000);
    await assertFails(
      setDoc(doc(db, 'workspaces', wsId, 'pages', 'p1', 'blocks', 'b1'), { ...validBlock(ALICE), content: huge })
    );
  });

  it('8. Unauthorized read: anonymous reads private workspace', async () => {
    const wsId = await seedAliceWorkspace();
    const db = anonCtx();
    await assertFails(getDoc(doc(db, 'workspaces', wsId)));
  });

  it('9. Unauthorized read: Bob reads Alice\'s page', async () => {
    const wsId = await seedAliceWorkspace();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'workspaces', wsId, 'pages', 'p1'), validPage(ALICE, wsId));
    });
    const db = bobCtx();
    await assertFails(getDoc(doc(db, 'workspaces', wsId, 'pages', 'p1')));
  });

  it('10. Shadow update: update block missing required type field', async () => {
    const wsId = await seedAliceWorkspace();
    await env.withSecurityRulesDisabled(async (ctx) => {
      const fs = ctx.firestore();
      await setDoc(doc(fs, 'workspaces', wsId, 'pages', 'p1'), validPage(ALICE, wsId));
      await setDoc(doc(fs, 'workspaces', wsId, 'pages', 'p1', 'blocks', 'b1'), validBlock(ALICE));
    });
    const db = aliceCtx();
    await assertFails(
      setDoc(doc(db, 'workspaces', wsId, 'pages', 'p1', 'blocks', 'b1'), {
        order: 'a0',
        content: 'hi',
        ownerId: ALICE,
      } as any)
    );
  });

  it('11. Shadow update: workspace add ghost field isAdmin', async () => {
    const wsId = await seedAliceWorkspace();
    const db = aliceCtx();
    await assertFails(
      updateDoc(doc(db, 'workspaces', wsId), { isAdmin: true } as any)
    );
  });

  it('12. Query trust violation: list pages without ownerId filter', async () => {
    const wsId = await seedAliceWorkspace();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'workspaces', wsId, 'pages', 'p1'), validPage(ALICE, wsId));
    });
    const db = bobCtx();
    await assertFails(
      getDocs(collection(db, 'workspaces', wsId, 'pages'))
    );
  });

  it('Bonus: anonymous CAN read a published page (publish flow)', async () => {
    const wsId = await seedAliceWorkspace();
    await env.withSecurityRulesDisabled(async (ctx) => {
      const fs = ctx.firestore();
      await setDoc(doc(fs, 'workspaces', wsId, 'pages', 'p1'), {
        ...validPage(ALICE, wsId),
        published: true,
        slug: 'hello',
      });
    });
    const db = anonCtx();
    await assertSucceeds(getDoc(doc(db, 'workspaces', wsId, 'pages', 'p1')));
  });

  it('Bonus: anonymous CAN query published pages in a workspace', async () => {
    const wsId = await seedAliceWorkspace();
    await env.withSecurityRulesDisabled(async (ctx) => {
      const fs = ctx.firestore();
      await setDoc(doc(fs, 'workspaces', wsId, 'pages', 'p_public'), {
        ...validPage(ALICE, wsId),
        published: true,
        slug: 'hello-world',
      });
      await setDoc(doc(fs, 'workspaces', wsId, 'pages', 'p_private'), {
        ...validPage(ALICE, wsId),
        published: false,
      });
    });

    const db = anonCtx();
    await assertSucceeds(
      getDocs(
        query(
          collection(db, 'workspaces', wsId, 'pages'),
          where('published', '==', true),
          where('deleted', '==', false)
        )
      )
    );
  });
});
