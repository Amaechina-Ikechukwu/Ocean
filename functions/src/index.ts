import * as admin from 'firebase-admin';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions/v2';

admin.initializeApp();
const db = admin.firestore();

/**
 * Maintain the /publicPages/{slug} mirror collection for anonymous slug -> page resolution.
 *
 * Trigger: any write to /workspaces/{wsId}/pages/{pageId}.
 *
 * Rules:
 * - If the page is published, not deleted, and has a non-empty slug -> upsert
 *   /publicPages/{slug} with { workspaceId, pageId, ownerId }.
 * - If the page becomes unpublished/deleted, or its slug changes -> delete the
 *   stale mirror doc (only if it still points back at this page).
 */
export const syncPublicPageMirror = onDocumentWritten(
  'workspaces/{wsId}/pages/{pageId}',
  async (event) => {
    const wsId = event.params.wsId as string;
    const pageId = event.params.pageId as string;

    const before = event.data?.before.exists ? event.data.before.data() : undefined;
    const after = event.data?.after.exists ? event.data.after.data() : undefined;

    const wasPublic =
      !!before && before.published === true && before.deleted === false && typeof before.slug === 'string' && before.slug.length > 0;
    const isPublic =
      !!after && after.published === true && after.deleted === false && typeof after.slug === 'string' && after.slug.length > 0;

    const oldSlug = wasPublic ? (before!.slug as string) : null;
    const newSlug = isPublic ? (after!.slug as string) : null;

    if (oldSlug && oldSlug !== newSlug) {
      const ref = db.collection('publicPages').doc(oldSlug);
      const snap = await ref.get();
      if (snap.exists) {
        const data = snap.data();
        if (data?.workspaceId === wsId && data?.pageId === pageId) {
          await ref.delete().catch((e) => logger.warn('mirror delete failed', e));
        }
      }
    }

    if (newSlug) {
      const ref = db.collection('publicPages').doc(newSlug);
      const snap = await ref.get();
      if (snap.exists) {
        const data = snap.data();
        if (data && (data.workspaceId !== wsId || data.pageId !== pageId)) {
          logger.warn('slug collision; leaving existing mirror untouched', { newSlug, owner: data });
          return;
        }
      }
      await ref.set(
        {
          workspaceId: wsId,
          pageId,
          ownerId: after!.ownerId,
        },
        { merge: true }
      );
    }
  }
);
