(function () {
    'use strict';

    const STORAGE_KEY = 'mail_organizer_data';
    const GROUPS_KEY = 'mail_organizer_groups';

    let mails = loadData(STORAGE_KEY, []);
    let groups = loadData(GROUPS_KEY, []);
    let searchQuery = '';
    let editingId = null;
    let deletingId = null;
    let commentingId = null;
    let pickingGroupId = null; // for adding to group via modal

    const $ = s => document.getElementById(s);
    const $sections = $('sections-container');
    const $emptyState = $('empty-state');
    const $searchInput = $('search-input');
    const $toast = $('toast');

    const $modalOverlay = $('modal-overlay');
    const $modalTitleText = $('modal-title-text');
    const $inputEmail = $('input-email');
    const $inputName = $('input-name');
    const $inputComment = $('input-comment');

    const $groupModalOverlay = $('group-modal-overlay');
    const $inputGroupName = $('input-group-name');
    const $existingGroups = $('existing-groups');

    const $pickerOverlay = $('picker-overlay');
    const $pickerList = $('picker-list');
    const $pickerEmpty = $('picker-empty');
    const $pickerTitle = $('picker-title');
    let selectedForGroup = new Set();

    const $commentOverlay = $('comment-overlay');
    const $commentTextarea = $('comment-textarea');
    const $commentEmailPreview = $('comment-email-preview');

    const $deleteOverlay = $('delete-overlay');
    const $deleteEmailText = $('delete-email-text');

    // === Helpers ===
    function uid() { return Date.now().toString(36) + Math.random().toString(36).substring(2, 8); }
    function loadData(k, fb) { try { const d = localStorage.getItem(k); return d ? JSON.parse(d) : fb; } catch { return fb; } }
    function saveMails() { localStorage.setItem(STORAGE_KEY, JSON.stringify(mails)); }
    function saveGroups() { localStorage.setItem(GROUPS_KEY, JSON.stringify(groups)); }
    function esc(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

    function showToast(msg) {
        $toast.textContent = msg;
        $toast.classList.remove('hidden');
        $toast.classList.add('visible');
        setTimeout(() => { $toast.classList.remove('visible'); setTimeout(() => $toast.classList.add('hidden'), 300); }, 1500);
    }

    function copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => showToast('Скопировано'));
        } else {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.cssText = 'position:fixed;opacity:0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            showToast('Скопировано');
        }
        if (navigator.vibrate) navigator.vibrate(10);
    }

    // === Render ===
    function filterMails(list) {
        if (!searchQuery.trim()) return list;
        const q = searchQuery.toLowerCase().trim();
        return list.filter(m =>
            m.email.toLowerCase().includes(q) ||
            m.name.toLowerCase().includes(q) ||
            (m.comment && m.comment.toLowerCase().includes(q))
        );
    }

    function renderMailItem(mail, showRemoveBtn = false) {
        return `
        <div class="mail-item" data-id="${mail.id}" draggable="true">
            <div class="toggle-container">
                <button class="toggle-switch ${mail.status === 'checked' ? 'on' : ''}" data-id="${mail.id}"></button>
            </div>
            <div class="mail-info">
                <div class="mail-email-row">
                    <span class="mail-email">${esc(mail.email)}</span>
                    <button class="copy-btn" data-copy="${esc(mail.email)}" title="Копировать">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                    </button>
                </div>
                ${mail.name ? `<div class="mail-name">${esc(mail.name)}</div>` : ''}
                ${mail.comment ? `<div class="mail-comment-preview">💬 ${esc(mail.comment)}</div>` : ''}
            </div>
            ${showRemoveBtn ? `
            <button class="remove-from-group-btn" data-remove="${mail.id}" title="Убрать из группы">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
            ` : ''}
            <div class="mail-actions">
                <button class="action-icon-btn comment-btn ${mail.comment ? 'has-comment' : ''}" data-id="${mail.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                </button>
                <button class="action-icon-btn delete-btn" data-id="${mail.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </button>
            </div>
        </div>`;
    }

    function render() {
        const allFiltered = filterMails(mails);

        if (allFiltered.length === 0 && mails.length === 0) {
            $sections.innerHTML = '';
            $emptyState.classList.remove('hidden');
            return;
        }
        $emptyState.classList.add('hidden');

        const ungrouped = allFiltered.filter(m => !m.groupId);
        const grouped = {};
        groups.forEach(g => { grouped[g.id] = []; });
        allFiltered.forEach(m => { if (m.groupId && grouped[m.groupId]) grouped[m.groupId].push(m); });

        let html = '';

        groups.forEach(g => {
            const items = grouped[g.id] || [];
            if (items.length === 0 && searchQuery.trim()) return;
            html += `
            <div class="group-section" data-group-id="${g.id}">
                <div class="group-section-header">
                    <div class="group-section-left">
                        <span class="group-section-title">${esc(g.name)}</span>
                        <span class="group-section-count">${items.length}</span>
                    </div>
                    <button class="group-add-btn" data-add-to="${g.id}" title="Добавить почту">+</button>
                </div>
                <div class="group-section-items" data-group-id="${g.id}">
                    ${items.length > 0 ? items.map(m => renderMailItem(m, true)).join('') : '<div class="mail-item" style="justify-content:center;color:var(--text-faint);font-size:13px;padding:16px;border:none;">Перетащите сюда или нажмите +</div>'}
                </div>
            </div>`;
        });

        if (ungrouped.length > 0 || groups.length > 0) {
            const title = groups.length > 0 ? 'Без группы' : 'Все почты';
            if (ungrouped.length > 0) {
                html += `
                <div class="group-section" data-group-id="">
                    <div class="group-section-header">
                        <div class="group-section-left">
                            <span class="group-section-title">${title}</span>
                            <span class="group-section-count">${ungrouped.length}</span>
                        </div>
                    </div>
                    <div class="group-section-items" data-group-id="">
                        ${ungrouped.map(m => renderMailItem(m, false)).join('')}
                    </div>
                </div>`;
            }
        }

        if (groups.length === 0 && ungrouped.length > 0) {
            html = `
            <div class="group-section" data-group-id="">
                <div class="group-section-header">
                    <span class="group-section-title">Все почты</span>
                    <span class="group-section-count">${ungrouped.length}</span>
                </div>
                <div class="group-section-items" data-group-id="">
                    ${ungrouped.map(m => renderMailItem(m, false)).join('')}
                </div>
            </div>`;
        }

        if (!html && searchQuery.trim()) {
            html = '<div class="empty-state"><p class="empty-text">Ничего не найдено</p></div>';
        }

        $sections.innerHTML = html;
        setupDragAndDrop();
    }

    // === Select All ===
    function toggleSelectAll() {
        if (mails.length === 0) return;
        const allOn = mails.every(m => m.status === 'checked');
        mails.forEach(m => m.status = allOn ? 'unchecked' : 'checked');
        saveMails();
        render();
        if (navigator.vibrate) navigator.vibrate(10);
    }

    function toggleStatus(id) {
        const mail = mails.find(m => m.id === id);
        if (!mail) return;
        mail.status = mail.status === 'checked' ? 'unchecked' : 'checked';
        saveMails();
        const toggle = document.querySelector(`.toggle-switch[data-id="${id}"]`);
        if (toggle) toggle.classList.toggle('on', mail.status === 'checked');
        if (navigator.vibrate) navigator.vibrate(10);
    }

    // === Group Management ===
    function renderExistingGroups() {
        if (groups.length === 0) { $existingGroups.innerHTML = ''; return; }
        let html = '<p class="existing-groups-title">Существующие группы</p>';
        groups.forEach(g => {
            const count = mails.filter(m => m.groupId === g.id).length;
            html += `<div class="existing-group-item">
                <span class="existing-group-name">${esc(g.name)} <span style="color:var(--text-faint)">(${count})</span></span>
                <button class="existing-group-delete" data-delete-group="${g.id}">Удалить</button>
            </div>`;
        });
        $existingGroups.innerHTML = html;
    }

    function openGroupModal() {
        $inputGroupName.value = '';
        renderExistingGroups();
        $groupModalOverlay.classList.remove('hidden');
        setTimeout(() => $inputGroupName.focus(), 350);
    }
    function closeGroupModal() { $groupModalOverlay.classList.add('hidden'); }
    function saveGroup() {
        const name = $inputGroupName.value.trim();
        if (!name) return;
        groups.push({ id: uid(), name });
        saveGroups();
        $inputGroupName.value = '';
        renderExistingGroups();
        render();
    }
    function deleteGroup(groupId) {
        groups = groups.filter(g => g.id !== groupId);
        mails.forEach(m => { if (m.groupId === groupId) m.groupId = ''; });
        saveGroups(); saveMails();
        renderExistingGroups();
        render();
    }

    // === Picker Modal ===
    function openPickerModal(groupId) {
        pickingGroupId = groupId;
        const group = groups.find(g => g.id === groupId);
        $pickerTitle.textContent = `Добавить в «${group ? group.name : ''}»`;
        selectedForGroup = new Set();
        
        const available = mails.filter(m => !m.groupId);
        if (available.length === 0) {
            $pickerList.innerHTML = '';
            $pickerEmpty.classList.remove('hidden');
        } else {
            $pickerEmpty.classList.add('hidden');
            $pickerList.innerHTML = available.map(m => `
                <div class="picker-item" data-id="${m.id}">
                    <div class="picker-checkbox">
                        <svg class="picker-checkbox-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                    </div>
                    <div>
                        <div class="picker-email">${esc(m.email)}</div>
                        ${m.name ? `<div class="picker-name">${esc(m.name)}</div>` : ''}
                    </div>
                </div>
            `).join('');
        }
        $pickerOverlay.classList.remove('hidden');
    }

    function togglePickerItem(id, itemEl) {
        if (selectedForGroup.has(id)) {
            selectedForGroup.delete(id);
            itemEl.classList.remove('selected');
        } else {
            selectedForGroup.add(id);
            itemEl.classList.add('selected');
        }
    }

    function savePicker() {
        if (!pickingGroupId) return;
        mails.forEach(m => {
            if (selectedForGroup.has(m.id)) {
                m.groupId = pickingGroupId;
            }
        });
        saveMails();
        render();
        $pickerOverlay.classList.add('hidden');
    }

    // === Standard Modals ===
    function openAddModal() {
        editingId = null;
        $modalTitleText.textContent = 'Новая почта';
        $inputEmail.value = '';
        $inputName.value = '';
        $inputComment.value = '';
        $modalOverlay.classList.remove('hidden');
        setTimeout(() => $inputEmail.focus(), 350);
    }
    function openEditModal(id) {
        const mail = mails.find(m => m.id === id);
        if (!mail) return;
        editingId = id;
        $modalTitleText.textContent = 'Редактировать';
        $inputEmail.value = mail.email;
        $inputName.value = mail.name;
        $inputComment.value = mail.comment;
        $modalOverlay.classList.remove('hidden');
        setTimeout(() => $inputEmail.focus(), 350);
    }
    function closeAddModal() { $modalOverlay.classList.add('hidden'); editingId = null; }
    function saveModal() {
        const email = $inputEmail.value.trim();
        if (!email) { $inputEmail.style.borderColor = 'var(--red)'; setTimeout(() => $inputEmail.style.borderColor = '', 1500); return; }
        const name = $inputName.value.trim();
        const comment = $inputComment.value.trim();
        if (editingId) {
            const mail = mails.find(m => m.id === editingId);
            if (mail) { mail.email = email; mail.name = name; mail.comment = comment; }
        } else {
            mails.unshift({ id: uid(), email, name, groupId: '', status: 'unchecked', comment, createdAt: Date.now() });
        }
        saveMails(); closeAddModal(); render();
    }

    function openCommentModal(id) {
        const mail = mails.find(m => m.id === id);
        if (!mail) return;
        commentingId = id;
        $commentEmailPreview.textContent = mail.email;
        $commentTextarea.value = mail.comment || '';
        $commentOverlay.classList.remove('hidden');
        setTimeout(() => $commentTextarea.focus(), 350);
    }
    function closeCommentModal() { $commentOverlay.classList.add('hidden'); commentingId = null; }
    function saveComment() {
        if (!commentingId) return;
        const mail = mails.find(m => m.id === commentingId);
        if (mail) { mail.comment = $commentTextarea.value.trim(); saveMails(); render(); }
        closeCommentModal();
    }

    function openDeleteModal(id) {
        const mail = mails.find(m => m.id === id);
        if (!mail) return;
        deletingId = id;
        $deleteEmailText.textContent = mail.email;
        $deleteOverlay.classList.remove('hidden');
    }
    function closeDeleteModal() { $deleteOverlay.classList.add('hidden'); deletingId = null; }
    function confirmDelete() {
        if (!deletingId) return;
        mails = mails.filter(m => m.id !== deletingId);
        saveMails(); render(); closeDeleteModal();
    }

    // === Drag and Drop ===
    function setupDragAndDrop() {
        const items = document.querySelectorAll('.mail-item[draggable="true"]');
        const containers = document.querySelectorAll('.group-section-items');
        const sections = document.querySelectorAll('.group-section');

        items.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', item.dataset.id);
            });
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                sections.forEach(s => s.classList.remove('drop-target'));
            });
            
            // Touch drag support for mobile
            let touchTimer;
            item.addEventListener('touchstart', (e) => {
                if(e.target.closest('button')) return;
                touchTimer = setTimeout(() => {
                    item.classList.add('dragging');
                    if (navigator.vibrate) navigator.vibrate(10);
                }, 500); // long press
            }, {passive:true});
            item.addEventListener('touchmove', (e) => {
                if(!item.classList.contains('dragging')) {
                    clearTimeout(touchTimer);
                    return;
                }
                e.preventDefault();
                const touch = e.touches[0];
                item.style.top = (touch.clientY - item.offsetHeight/2) + 'px';
                item.style.left = '12px';
                
                // Find element under touch
                const elem = document.elementFromPoint(touch.clientX, touch.clientY);
                const section = elem ? elem.closest('.group-section') : null;
                sections.forEach(s => s.classList.remove('drop-target'));
                if (section) section.classList.add('drop-target');
            });
            item.addEventListener('touchend', (e) => {
                clearTimeout(touchTimer);
                if(!item.classList.contains('dragging')) return;
                item.classList.remove('dragging');
                item.style.top = '';
                item.style.left = '';
                
                const touch = e.changedTouches[0];
                const elem = document.elementFromPoint(touch.clientX, touch.clientY);
                const section = elem ? elem.closest('.group-section') : null;
                sections.forEach(s => s.classList.remove('drop-target'));
                
                if (section) {
                    const mailId = item.dataset.id;
                    const targetGroupId = section.dataset.groupId || '';
                    moveMailToGroup(mailId, targetGroupId);
                }
            });
        });

        containers.forEach(container => {
            container.addEventListener('dragover', e => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                const section = container.closest('.group-section');
                if (section) section.classList.add('drop-target');
            });
            container.addEventListener('dragleave', e => {
                const section = container.closest('.group-section');
                if (section) section.classList.remove('drop-target');
            });
            container.addEventListener('drop', e => {
                e.preventDefault();
                const section = container.closest('.group-section');
                if (section) section.classList.remove('drop-target');
                const mailId = e.dataTransfer.getData('text/plain');
                const targetGroupId = container.dataset.groupId || '';
                moveMailToGroup(mailId, targetGroupId);
            });
        });
    }

    function moveMailToGroup(mailId, groupId) {
        const mail = mails.find(m => m.id === mailId);
        if (mail && mail.groupId !== groupId) {
            mail.groupId = groupId;
            saveMails();
            render();
            if (navigator.vibrate) navigator.vibrate(10);
        }
    }

    // === Events ===
    $('btn-add').addEventListener('click', openAddModal);
    $('btn-add-group').addEventListener('click', openGroupModal);
    $('btn-select-all').addEventListener('click', toggleSelectAll);

    $('modal-cancel').addEventListener('click', closeAddModal);
    $('modal-save').addEventListener('click', saveModal);

    $('group-modal-cancel').addEventListener('click', closeGroupModal);
    $('group-modal-save').addEventListener('click', saveGroup);

    $('picker-cancel').addEventListener('click', () => $pickerOverlay.classList.add('hidden'));
    $('picker-save').addEventListener('click', savePicker);

    $('comment-cancel').addEventListener('click', closeCommentModal);
    $('comment-save').addEventListener('click', saveComment);

    $('delete-cancel-btn').addEventListener('click', closeDeleteModal);
    $('delete-confirm').addEventListener('click', confirmDelete);

    [$modalOverlay, $groupModalOverlay, $pickerOverlay, $commentOverlay, $deleteOverlay].forEach(ov => {
        ov.addEventListener('click', e => { if (e.target === ov) ov.classList.add('hidden'); });
    });

    $searchInput.addEventListener('input', e => { searchQuery = e.target.value; render(); });

    $existingGroups.addEventListener('click', e => {
        const btn = e.target.closest('[data-delete-group]');
        if (btn) deleteGroup(btn.dataset.deleteGroup);
    });

    $pickerList.addEventListener('click', e => {
        const item = e.target.closest('.picker-item');
        if (item) togglePickerItem(item.dataset.id, item);
    });

    $sections.addEventListener('click', e => {
        const toggle = e.target.closest('.toggle-switch');
        if (toggle) { toggleStatus(toggle.dataset.id); return; }

        const addBtn = e.target.closest('.group-add-btn');
        if (addBtn) { openPickerModal(addBtn.dataset.addTo); return; }

        const removeBtn = e.target.closest('.remove-from-group-btn');
        if (removeBtn) { moveMailToGroup(removeBtn.dataset.remove, ''); return; }

        const copyBtn = e.target.closest('.copy-btn');
        if (copyBtn) { 
            copyToClipboard(copyBtn.dataset.copy); 
            const card = copyBtn.closest('.mail-item');
            if (card) {
                const id = card.dataset.id;
                const mail = mails.find(m => m.id === id);
                if (mail && mail.status !== 'unchecked') {
                    mail.status = 'unchecked';
                    saveMails();
                    const toggle = document.querySelector(`.toggle-switch[data-id="${id}"]`);
                    if (toggle) toggle.classList.remove('on');
                }
            }
            return; 
        }

        const commentBtn = e.target.closest('.comment-btn');
        if (commentBtn) { openCommentModal(commentBtn.dataset.id); return; }

        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) { openDeleteModal(deleteBtn.dataset.id); return; }

        const mailInfo = e.target.closest('.mail-info');
        if (mailInfo) {
            const card = mailInfo.closest('.mail-item');
            if (card) openEditModal(card.dataset.id);
        }
    });

    $inputEmail.addEventListener('keydown', e => { if (e.key === 'Enter') $inputName.focus(); });
    $inputName.addEventListener('keydown', e => { if (e.key === 'Enter') saveModal(); });
    $inputGroupName.addEventListener('keydown', e => { if (e.key === 'Enter') saveGroup(); });

    render();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
