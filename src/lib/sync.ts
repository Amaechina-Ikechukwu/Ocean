import { useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { generateKeyBetween } from 'fractional-indexing';
import { useEditorStore } from './store';
import { db, auth } from './firebase';
import { collection, doc, setDoc, getDocs, updateDoc, query, where, getDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './firestore-errors';

export function useFirebaseSync() {
  const { workspaces, pages, blocks, dirtyPages, dirtyBlocks } = useEditorStore();

  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    if (dirtyPages.size > 0 || dirtyBlocks.size > 0) {
      const { setSidebarExpanded, toggleSidebarPage, ...rest } = useEditorStore.getState();
      
      const syncChanges = async () => {
        try {
          for (const pageId of dirtyPages) {
            const page = rest.pages[pageId];
            if (!page) continue;

            const wsId = page.workspaceId;
            const wsPath = `workspaces/${wsId}`;
            const wsRef = doc(db, 'workspaces', wsId);
            
            const workspace = rest.workspaces.find(w => w.id === wsId);
            if (workspace) {
              // If this workspace is owned by someone else, don't attempt to write it.
              if (workspace.ownerId && workspace.ownerId !== uid) {
                continue;
              }
              // Read the remote workspace doc to determine whether this is a create or update.
              const remoteSnap = await getDoc(wsRef).catch(() => null);
              const remoteExists = remoteSnap && remoteSnap.exists();

              if (!remoteExists) {
                // Creating on server: include ownerId (must match request.auth.uid per rules)
                await setDoc(wsRef, {
                  name: workspace.name,
                  ownerId: uid,
                  createdAt: workspace.createdAt,
                  icon: workspace.icon || '',
                  type: workspace.type || 'blog'
                }, { merge: true }).catch(err => handleFirestoreError(err, OperationType.WRITE, wsPath));

                // Ensure local store reflects the owner we set server-side
                if (workspace.ownerId !== uid) {
                  useEditorStore.setState(state => ({
                    workspaces: state.workspaces.map(w => w.id === wsId ? { ...w, ownerId: uid } : w)
                  }));
                }
              } else {
                // Remote exists: do not attempt to overwrite ownerId (rules forbid changing it)
                await setDoc(wsRef, {
                  name: workspace.name,
                  createdAt: workspace.createdAt,
                  icon: workspace.icon || '',
                  type: workspace.type || 'blog'
                }, { merge: true }).catch(err => handleFirestoreError(err, OperationType.WRITE, wsPath));
              }
            }

            // Also update page ownerId if needed
            if (page.ownerId !== uid) {
              useEditorStore.setState(state => ({
                pages: {
                  ...state.pages,
                  [page.id]: { ...page, ownerId: uid }
                }
              }));
            }

            const pagePath = `${wsPath}/pages/${page.id}`;
            const pageRef = doc(db, 'workspaces', wsId, 'pages', page.id);
            
            if (page.deleted) {
              await updateDoc(pageRef, { deleted: true }).catch(err => handleFirestoreError(err, OperationType.WRITE, pagePath));
            } else {
              const pagePayload: Record<string, any> = {
                workspaceId: wsId,
                title: page.title || '',
                order: page.order,
                timestamp: page.timestamp,
                deleted: page.deleted,
                parentId: page.parentId || '',
                icon: page.icon || '',
                coverImage: page.coverImage || '',
                published: page.published || false,
                ownerId: uid,
              };
              if (page.slug !== undefined) pagePayload.slug = page.slug;
              if (page.publishedAt !== undefined) pagePayload.publishedAt = page.publishedAt;
              if (page.seo !== undefined) pagePayload.seo = page.seo;
              await setDoc(pageRef, pagePayload, { merge: true }).catch(err => handleFirestoreError(err, OperationType.WRITE, pagePath));

              const pageBlocks = rest.blocks[page.id] || [];
              for (const block of pageBlocks) {
                // Also update block ownerId if needed
                if (block.ownerId !== uid) {
                   useEditorStore.setState(state => ({
                     blocks: {
                       ...state.blocks,
                       [page.id]: (state.blocks[page.id] || []).map(b => b.id === block.id ? { ...b, ownerId: uid } : b)
                     }
                   }));
                }
                const blockPath = `${pagePath}/blocks/${block.id}`;
                const blockRef = doc(db, 'workspaces', wsId, 'pages', page.id, 'blocks', block.id);
                await setDoc(blockRef, {
                  type: block.type,
                  order: block.order,
                  content: block.content || '',
                  parentId: block.parentId || '',
                  attrs: block.attrs || {},
                  ownerId: uid,
                }, { merge: true }).catch(err => handleFirestoreError(err, OperationType.WRITE, blockPath));
              }
              
              await setDoc(doc(db, 'vectorizationRequests', page.id), {
                workspaceId: wsId,
                pageId: page.id,
                type: 'page',
                pending: true,
                createdAt: serverTimestamp(),
                ownerId: uid,
              }).catch(() => {});
            }
          }

          for (const { pageId, blockId } of dirtyBlocks) {
            const blockPage = rest.pages[pageId];
            if (!blockPage) continue;
            await setDoc(doc(db, 'vectorizationRequests', `${pageId}_${blockId}`), {
              workspaceId: blockPage.workspaceId,
              pageId,
              blockId,
              type: 'block',
              pending: true,
              createdAt: serverTimestamp(),
              ownerId: uid,
            }).catch(() => {});
          }

          useEditorStore.setState({ dirtyPages: new Set(), dirtyBlocks: new Set() });
        } catch (error) {
          console.error("Sync error", error);
        }
      };

      const timer = setTimeout(syncChanges, 1500);
      return () => clearTimeout(timer);
    }
  }, [dirtyPages, dirtyBlocks, workspaces, pages, blocks]);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      if (!auth.currentUser) return;
      
      try {
        const wsRef = query(collection(db, 'workspaces'), where('ownerId', '==', auth.currentUser.uid));
        const wsSnap = await getDocs(wsRef).catch(err => handleFirestoreError(err, OperationType.LIST, 'workspaces'));
        if (!wsSnap) return;

        let loadedWorkspaces: any[] = [];
        let loadedPages: Record<string, any> = {};
        let loadedBlocks: Record<string, any[]> = {};
        
        for (const wsDoc of wsSnap.docs) {
          const wsId = wsDoc.id;
          const wsData = wsDoc.data();
          loadedWorkspaces.push({ id: wsId, type: 'blog', ...wsData });
          
          const pagesRef = query(collection(db, 'workspaces', wsId, 'pages'), where('ownerId', '==', auth.currentUser.uid));
          const pagesSnap = await getDocs(pagesRef).catch(err => handleFirestoreError(err, OperationType.LIST, `workspaces/${wsId}/pages`));
          if (!pagesSnap) continue;

          for (const pageDoc of pagesSnap.docs) {
            const pageData = pageDoc.data();
            if (pageData.deleted) continue; 
            
            loadedPages[pageDoc.id] = { id: pageDoc.id, ...pageData, parentId: pageData.parentId || null };
            
            const blocksRef = query(collection(db, 'workspaces', wsId, 'pages', pageDoc.id, 'blocks'), where('ownerId', '==', auth.currentUser.uid));
            const blocksSnap = await getDocs(blocksRef).catch(err => handleFirestoreError(err, OperationType.LIST, `workspaces/${wsId}/pages/${pageDoc.id}/blocks`));
            if (!blocksSnap) continue;
            
            loadedBlocks[pageDoc.id] = blocksSnap.docs.map(b => ({
              id: b.id,
              ...b.data(),
              parentId: b.data().parentId || null
            })) as any;
          }
        }

        if (active) {
          if (loadedWorkspaces.length > 0) {
            useEditorStore.setState(state => ({
              workspaces: loadedWorkspaces,
              pages: { ...state.pages, ...loadedPages },
              blocks: { ...state.blocks, ...loadedBlocks },
            }));
          } else {
            await createDefaultWorkspace();
          }
        }
      } catch (error) {
         console.error("Load data error", error);
      }
    };
    
    const unsub = auth.onAuthStateChanged(user => {
      if (user) loadData();
    });

      return () => {
        active = false;
        unsub();
      };
    }, []);
  }

async function createDefaultWorkspace() {
  const user = auth.currentUser;
  if (!user) return;
  const uid = user.uid;

  const wsId = uuidv4();
  const pageId = uuidv4();
  const blockId = uuidv4();
  const now = Date.now();

  const workspace = {
    name: 'Personal Workspace',
    ownerId: uid,
    createdAt: now,
    icon: '🌊',
    type: 'blog',
  };

  const page = {
    workspaceId: wsId,
    title: 'Welcome to Ocean',
    order: generateKeyBetween(null, null),
    timestamp: now,
    deleted: false,
    parentId: null,
    icon: '✨',
    coverImage: '',
    published: false,
    ownerId: uid,
  };

  const block = {
    type: 'text' as const,
    order: generateKeyBetween(null, null),
    content: 'Dive deep into your thoughts. Type / for commands.',
    parentId: null,
    attrs: {},
    ownerId: uid,
  };

  try {
    await setDoc(doc(db, 'workspaces', wsId), workspace);
    await setDoc(doc(db, 'workspaces', wsId, 'pages', pageId), page);
    await setDoc(doc(db, 'workspaces', wsId, 'pages', pageId, 'blocks', blockId), block);

    useEditorStore.setState({
      workspaces: [{ id: wsId, ...workspace }],
      pages: { [pageId]: { id: pageId, ...page } },
      blocks: { [pageId]: [{ id: blockId, ...block }] },
      activeWorkspaceId: wsId,
      activePageId: pageId,
    });
  } catch (error) {
    console.error('Failed to create default workspace', error);
  }
}
