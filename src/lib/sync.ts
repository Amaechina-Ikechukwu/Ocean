import { useEffect } from 'react';
import { useEditorStore } from './store';
import { db, auth } from './firebase';
import { collection, doc, setDoc, getDocs, updateDoc, query, where } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './firestore-errors';
import { createOceanApiClient, API_ORIGIN } from './api';

export function useFirebaseSync() {
  const { workspaces, pages, blocks, dirtyPages, dirtyBlocks } = useEditorStore();

  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const oceanApiClient = createOceanApiClient({
      baseUrl: API_ORIGIN,
      getIdToken: () => auth.currentUser!.getIdToken()
    });

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
              if (workspace.ownerId !== uid) {
                useEditorStore.setState(state => ({
                  workspaces: state.workspaces.map(w => w.id === wsId ? { ...w, ownerId: uid } : w)
                }));
              }
              await setDoc(wsRef, {
                name: workspace.name,
                ownerId: uid,
                createdAt: workspace.createdAt,
                icon: workspace.icon || ''
              }, { merge: true }).catch(err => handleFirestoreError(err, OperationType.WRITE, wsPath));
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
              await setDoc(pageRef, {
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
              }, { merge: true }).catch(err => handleFirestoreError(err, OperationType.WRITE, pagePath));

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
              
              oceanApiClient.request(`/api/ai/pages/${page.id}/vectorize`, {
                method: 'POST',
                body: JSON.stringify({ workspaceId: wsId, limit: 100 })
              }).catch(() => {});
            }
          }

          for (const { pageId, blockId } of dirtyBlocks) {
            oceanApiClient.request(`/api/ai/pages/${pageId}/blocks/${blockId}/vectorize`, {
              method: 'POST'
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
          loadedWorkspaces.push({ id: wsId, ...wsDoc.data() });
          
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

        if (active && loadedWorkspaces.length > 0) {
          useEditorStore.setState(state => {
            return {
              workspaces: loadedWorkspaces,
              pages: { ...state.pages, ...loadedPages },
              blocks: { ...state.blocks, ...loadedBlocks },
            };
          });
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
