/* ============================================
   Mail Organizer — App Logic v2
   Groups, Select All, Copy, Minimal
   ============================================ */

(function () {
    'use strict';

    const STORAGE_KEY = 'mail_organizer_data';
    const GROUPS_KEY = 'mail_organizer_groups';

    let mails = loadData(STORAGE_KEY, []);
    let groups = loadData(GROUPS_KEY, []);
    let currentGroup = 'all';
    let searchQuery = '';
    let editingId = null;
    let deletingId = null;
    let commentingId = null;

    // ===== DOM =====
    const $ = (s) => document.getElementById(s);
    const $container = $('mail-items-container');
    const $emptyState = $('empty-state');
    const $searchInput = $('search-input');
    const $groupTabs = $('group-tabs');
    const $toast = $('toast');

    // Add modal
    const $modalOverlay = $('modal-overlay');
    const $modalTitleText = $('modal-title-text');
    const $inputEmail = $('input-email');
    const $inputName = $('input-name');
    const $inputComment = $('input-comment');
    const $inputGroupSelect = $('input-group-select');

    // Group modal
    const $groupModalOverlay = $('group-modal-overlay');
    const $groupModalTitle = $('group-modal-title');
    const $inputGroupName = $('input-group-name');
    const $existingGroups = $('existing-groups');

    // Comment modal
    const $commentOverlay = $('comment-overlay');
    const $commentTextarea = $('comment-textarea');
    const $commentEmailPreview = $('comment-email-preview');

    // Delete modal
    const $deleteOverlay = $('delete-overlay');
    const $deleteEmailText = $('delete-email-text');

    // ===== HELPERS =====
    function uid() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
    }

    function loadData(key, fallback) {
        try {
            const d = localStorage.getItem(key);
            return d ? JSON.parse(d) : fallback;
        } catch { return fallback; }
    }

    function saveMails() { localStorage.setItem(STORAGE_KEY, JSON.stringify(mails)); }
    function saveGroups() { localStorage.setItem(GROUPS_KEY, JSON.stringify(groups)); }

    function esc(text) {
        const d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
    }

    function showToast(msg) {
        $toast.textContent = msg;
        $toast.classList.remove('hidden');
        $toast.classList.add('visible');
        setTimeout(() => {
            $toast.classList.remove('visible');
            setTimeout(() => $toast.classList.add('hidden'), 300);
        }, 1500);
    }

    function copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => showToast('Скопировано: ' + text));
        } else {
            // Fallback
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            showToast('Скопировано: ' + text);
        }
        if (navigator.vibrate) navigator.vibrate(10);
    }

    // ===== GROUPS =====
    function renderGroupTabs() {
        let html = '<button class="group-tab ' + (currentGroup === 'all' ? 'active' : '') + '" data-group="all">Все</button>';
        groups.forEach(g => {
            html += `<button class="group-tab ${currentGroup === g.id ? 'active' : ''}" data-group="${g.id}">
                ${esc(g.name)}<span class="tab-delete" data-delete-group="${g.id}"> ✕</span>
            </button>`;
        });
        $groupTabs.innerHTML = html;
    }

    function renderGroupSelect(selectedId) {
        let html = '<option value="">Без группы</option>';
        groups.forEach(g => {
            html += `<option value="${g.id}" ${selectedId === g.id ? 'selected' : ''}>${esc(g.name)}</option>`;
        });
        $inputGroupSelect.innerHTML = html;
    }

    function renderExistingGroups() {
        if (groups.length === 0) {
            $existingGroups.innerHTML = '';
            return;
        }
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

    // ===== RENDER =====
    function getFiltered() {
        let result = mails;
        if (currentGroup !== 'all') {
            result = result.filter(m => m.groupId === currentGroup);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            result = result.filter(m =>
                m.email.toLowerCase().includes(q) ||
                m.name.toLowerCase().includes(q) ||
                (m.comment && m.comment.toLowerCase().includes(q))
            );
        }
        return result;
    }

    function render() {
        const filtered = getFiltered();
        renderGroupTabs();

        if (filtered.length === 0) {
            $container.innerHTML = '';
            $emptyState.classList.remove('hidden');
            return;
        }

        $emptyState.classList.add('hidden');
        $container.innerHTML = filtered.map((mail, i) => {
            const group = groups.find(g => g.id === mail.groupId);
            return `
            <div class="mail-item" data-id="${mail.id}" style="animation-delay:${i * 0.03}s">
                <button class="mail-checkbox ${mail.status}" data-id="${mail.id}">
                    <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <svg class="cross-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
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
                    ${group ? `<span class="mail-group-tag">${esc(group.name)}</span>` : ''}
                    ${mail.comment ? `<div class="mail-comment-preview">💬 ${esc(mail.comment)}</div>` : ''}
                </div>
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
        }).join('');
    }

    // ===== SELECT ALL =====
    function toggleSelectAll() {
        const filtered = getFiltered();
        if (filtered.length === 0) return;

        const allChecked = filtered.every(m => m.status === 'checked');
        const newStatus = allChecked ? 'unchecked' : 'checked';
        filtered.forEach(m => m.status = newStatus);
        saveMails();
        render();
        if (navigator.vibrate) navigator.vibrate(10);
    }

    // ===== TOGGLE CHECKBOX =====
    function toggleStatus(id) {
        const mail = mails.find(m => m.id === id);
        if (!mail) return;
        mail.status = mail.status === 'checked' ? 'unchecked' : 'checked';
        saveMails();

        const cb = document.querySelector(`.mail-checkbox[data-id="${id}"]`);
        if (cb) {
            cb.classList.remove('checked', 'unchecked');
            cb.classList.add(mail.status);
        }
        if (navigator.vibrate) navigator.vibrate(10);
    }

    // ===== MODALS =====
    function openAddModal() {
        editingId = null;
        $modalTitleText.textContent = 'Новая почта';
        $inputEmail.value = '';
        $inputName.value = '';
        $inputComment.value = '';
        renderGroupSelect('');
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
        renderGroupSelect(mail.groupId || '');
        $modalOverlay.classList.remove('hidden');
        setTimeout(() => $inputEmail.focus(), 350);
    }

    function closeAddModal() { $modalOverlay.classList.add('hidden'); editingId = null; }

    function saveModal() {
        const email = $inputEmail.value.trim();
        if (!email) {
            $inputEmail.style.borderColor = 'var(--red)';
            setTimeout(() => $inputEmail.style.borderColor = '', 1500);
            return;
        }
        const name = $inputName.value.trim();
        const comment = $inputComment.value.trim();
        const groupId = $inputGroupSelect.value || '';

        if (editingId) {
            const mail = mails.find(m => m.id === editingId);
            if (mail) { mail.email = email; mail.name = name; mail.comment = comment; mail.groupId = groupId; }
        } else {
            mails.unshift({ id: uid(), email, name, groupId, status: 'unchecked', comment, createdAt: Date.now() });
        }
        saveMails();
        closeAddModal();
        render();
    }

    // Group modal
    function openGroupModal() {
        $inputGroupName.value = '';
        $groupModalTitle.textContent = 'Группы';
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
        renderGroupTabs();
    }

    function deleteGroup(groupId) {
        groups = groups.filter(g => g.id !== groupId);
        mails.forEach(m => { if (m.groupId === groupId) m.groupId = ''; });
        saveGroups();
        saveMails();
        if (currentGroup === groupId) currentGroup = 'all';
        renderExistingGroups();
        render();
    }

    // Comment modal
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

    // Delete modal
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
        const card = document.querySelector(`.mail-item[data-id="${deletingId}"]`);
        if (card) {
            card.classList.add('removing');
            setTimeout(() => { mails = mails.filter(m => m.id !== deletingId); saveMails(); render(); closeDeleteModal(); }, 250);
        } else {
            mails = mails.filter(m => m.id !== deletingId); saveMails(); render(); closeDeleteModal();
        }
    }

    // ===== EVENTS =====
    $('btn-add').addEventListener('click', openAddModal);
    $('btn-add-group').addEventListener('click', openGroupModal);
    $('btn-select-all').addEventListener('click', toggleSelectAll);

    $('modal-cancel').addEventListener('click', closeAddModal);
    $('modal-save').addEventListener('click', saveModal);

    $('group-modal-cancel').addEventListener('click', closeGroupModal);
    $('group-modal-save').addEventListener('click', saveGroup);

    $('comment-cancel').addEventListener('click', closeCommentModal);
    $('comment-save').addEventListener('click', saveComment);

    $('delete-cancel-btn').addEventListener('click', closeDeleteModal);
    $('delete-confirm').addEventListener('click', confirmDelete);

    // Close overlays on bg click
    [$modalOverlay, $groupModalOverlay, $commentOverlay, $deleteOverlay].forEach(ov => {
        ov.addEventListener('click', e => { if (e.target === ov) ov.classList.add('hidden'); });
    });

    // Search
    $searchInput.addEventListener('input', e => { searchQuery = e.target.value; render(); });

    // Group tabs
    $groupTabs.addEventListener('click', e => {
        // Delete group button
        const delBtn = e.target.closest('[data-delete-group]');
        if (delBtn) { deleteGroup(delBtn.dataset.deleteGroup); return; }

        const tab = e.target.closest('.group-tab');
        if (!tab) return;
        currentGroup = tab.dataset.group;
        render();
    });

    // Group modal — delete existing group
    $existingGroups.addEventListener('click', e => {
        const btn = e.target.closest('[data-delete-group]');
        if (btn) deleteGroup(btn.dataset.deleteGroup);
    });

    // Mail list delegation
    $container.addEventListener('click', e => {
        const cb = e.target.closest('.mail-checkbox');
        if (cb) { toggleStatus(cb.dataset.id); return; }

        const copyBtn = e.target.closest('.copy-btn');
        if (copyBtn) { copyToClipboard(copyBtn.dataset.copy); return; }

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

    // Enter in inputs
    $inputEmail.addEventListener('keydown', e => { if (e.key === 'Enter') $inputName.focus(); });
    $inputName.addEventListener('keydown', e => { if (e.key === 'Enter') saveModal(); });
    $inputGroupName.addEventListener('keydown', e => { if (e.key === 'Enter') saveGroup(); });

    // Swipe to delete
    let touchStartX = 0, touchStartY = 0, swiping = false, swipeCard = null;

    $container.addEventListener('touchstart', e => {
        const card = e.target.closest('.mail-item');
        if (!card || e.target.closest('button')) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        swipeCard = card;
        swiping = false;
    }, { passive: true });

    $container.addEventListener('touchmove', e => {
        if (!swipeCard) return;
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        if (!swiping && Math.abs(dx) > 15 && Math.abs(dx) > Math.abs(dy)) swiping = true;
        if (swiping && dx < 0) {
            swipeCard.style.transform = `translateX(${Math.max(dx, -120)}px)`;
            swipeCard.style.transition = 'none';
        }
    }, { passive: true });

    $container.addEventListener('touchend', () => {
        if (!swipeCard) return;
        if (swiping) {
            const m = swipeCard.style.transform.match(/translateX\(([-\d.]+)px\)/);
            const offset = m ? parseFloat(m[1]) : 0;
            swipeCard.style.transition = 'transform 0.3s ease';
            if (offset < -80) openDeleteModal(swipeCard.dataset.id);
            swipeCard.style.transform = '';
        }
        swipeCard = null;
        swiping = false;
    });

    // ===== INIT =====
    render();

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    }
})();
