/* ============================================
   Mail Organizer — App Logic
   ============================================ */

(function () {
    'use strict';

    // ===== STATE =====
    const STORAGE_KEY = 'mail_organizer_data';
    let mails = loadMails();
    let currentFilter = 'all';
    let searchQuery = '';
    let editingId = null; // for edit mode
    let deletingId = null;
    let commentingId = null;
    let filtersVisible = false;

    // ===== DOM REFS =====
    const $container = document.getElementById('mail-items-container');
    const $emptyState = document.getElementById('empty-state');
    const $searchInput = document.getElementById('search-input');
    const $filterTabs = document.getElementById('filter-tabs');
    const $mailList = document.getElementById('mail-list');

    // Stats
    const $statTotal = document.getElementById('stat-total');
    const $statDone = document.getElementById('stat-done');
    const $statPending = document.getElementById('stat-pending');

    // Add modal
    const $modalOverlay = document.getElementById('modal-overlay');
    const $modalTitleText = document.getElementById('modal-title-text');
    const $inputEmail = document.getElementById('input-email');
    const $inputName = document.getElementById('input-name');
    const $inputComment = document.getElementById('input-comment');
    const $categoryPicker = document.getElementById('category-picker');
    const $btnAdd = document.getElementById('btn-add');
    const $btnFilter = document.getElementById('btn-filter');
    const $modalCancel = document.getElementById('modal-cancel');
    const $modalSave = document.getElementById('modal-save');

    // Comment modal
    const $commentOverlay = document.getElementById('comment-overlay');
    const $commentTextarea = document.getElementById('comment-textarea');
    const $commentEmailPreview = document.getElementById('comment-email-preview');
    const $commentCancel = document.getElementById('comment-cancel');
    const $commentSave = document.getElementById('comment-save');

    // Delete
    const $deleteOverlay = document.getElementById('delete-overlay');
    const $deleteEmailText = document.getElementById('delete-email-text');
    const $deleteConfirm = document.getElementById('delete-confirm');
    const $deleteCancelBtn = document.getElementById('delete-cancel-btn');

    // ===== HELPERS =====
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
    }

    function loadMails() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : getDefaultMails();
        } catch {
            return getDefaultMails();
        }
    }

    function saveMails() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mails));
    }

    function getDefaultMails() {
        return [];
    }

    function getCategoryLabel(cat) {
        const map = { personal: 'Личная', work: 'Рабочая', social: 'Соцсети', other: 'Другое' };
        return map[cat] || cat;
    }

    function getSelectedCategory() {
        const active = $categoryPicker.querySelector('.category-chip.active');
        return active ? active.dataset.category : 'personal';
    }

    // ===== RENDERING =====
    function getFilteredMails() {
        let result = mails;

        // Filter by tab
        if (currentFilter === 'checked') {
            result = result.filter(m => m.status === 'checked');
        } else if (currentFilter === 'unchecked') {
            result = result.filter(m => m.status === 'unchecked');
        } else if (currentFilter === 'commented') {
            result = result.filter(m => m.comment && m.comment.trim().length > 0);
        }

        // Filter by search
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
        const filtered = getFilteredMails();
        updateStats();

        if (filtered.length === 0) {
            $container.innerHTML = '';
            $emptyState.classList.remove('hidden');
            return;
        }

        $emptyState.classList.add('hidden');

        $container.innerHTML = filtered.map((mail, index) => `
            <div class="mail-item ${mail.status === 'checked' ? 'done' : ''}"
                 data-id="${mail.id}"
                 data-category="${mail.category}"
                 style="animation-delay: ${index * 0.04}s">
                <div class="checkbox-container">
                    <button class="mail-checkbox ${mail.status}" data-id="${mail.id}" aria-label="Переключить статус">
                        <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <svg class="cross-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                <div class="mail-info">
                    <div class="mail-email">${escapeHtml(mail.email)}</div>
                    ${mail.name ? `<div class="mail-name">${escapeHtml(mail.name)}</div>` : ''}
                    <span class="mail-category-badge" data-cat="${mail.category}">${getCategoryLabel(mail.category)}</span>
                    ${mail.comment ? `<div class="mail-comment-preview">💬 ${escapeHtml(mail.comment)}</div>` : ''}
                </div>
                <div class="mail-actions">
                    <button class="action-icon-btn comment-btn ${mail.comment ? 'has-comment' : ''}" data-id="${mail.id}" aria-label="Комментарий">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                    </button>
                    <button class="action-icon-btn delete-btn" data-id="${mail.id}" aria-label="Удалить">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function updateStats() {
        const total = mails.length;
        const done = mails.filter(m => m.status === 'checked').length;
        const pending = total - done;

        animateNumber($statTotal, total);
        animateNumber($statDone, done);
        animateNumber($statPending, pending);
    }

    function animateNumber(el, target) {
        const current = parseInt(el.textContent) || 0;
        if (current === target) return;
        el.textContent = target;
        el.style.transform = 'scale(1.3)';
        setTimeout(() => el.style.transition = 'transform 0.3s ease', 0);
        setTimeout(() => el.style.transform = 'scale(1)', 20);
    }

    // ===== TOGGLE CHECKBOX =====
    function toggleStatus(id) {
        const mail = mails.find(m => m.id === id);
        if (!mail) return;

        const prevStatus = mail.status;
        mail.status = prevStatus === 'checked' ? 'unchecked' : 'checked';
        saveMails();

        // Animate checkbox
        const checkbox = document.querySelector(`.mail-checkbox[data-id="${id}"]`);
        if (checkbox) {
            checkbox.classList.remove('checked', 'unchecked', 'pulse-green', 'pulse-red');
            // Force reflow
            void checkbox.offsetWidth;
            checkbox.classList.add(mail.status);
            checkbox.classList.add(mail.status === 'checked' ? 'pulse-green' : 'pulse-red');

            // Add haptic feedback if available
            if (navigator.vibrate) {
                navigator.vibrate(10);
            }
        }

        // Update done class on card
        const card = document.querySelector(`.mail-item[data-id="${id}"]`);
        if (card) {
            card.classList.toggle('done', mail.status === 'checked');
        }

        updateStats();
    }

    // ===== MODALS =====
    function openAddModal() {
        editingId = null;
        $modalTitleText.textContent = 'Новая почта';
        $inputEmail.value = '';
        $inputName.value = '';
        $inputComment.value = '';
        resetCategoryPicker('personal');
        $modalOverlay.classList.remove('hidden');
        setTimeout(() => $inputEmail.focus(), 400);
    }

    function openEditModal(id) {
        const mail = mails.find(m => m.id === id);
        if (!mail) return;

        editingId = id;
        $modalTitleText.textContent = 'Редактировать';
        $inputEmail.value = mail.email;
        $inputName.value = mail.name;
        $inputComment.value = mail.comment;
        resetCategoryPicker(mail.category);
        $modalOverlay.classList.remove('hidden');
        setTimeout(() => $inputEmail.focus(), 400);
    }

    function closeAddModal() {
        $modalOverlay.classList.add('hidden');
        editingId = null;
    }

    function saveModal() {
        const email = $inputEmail.value.trim();
        if (!email) {
            $inputEmail.style.borderColor = 'var(--accent-red)';
            $inputEmail.style.boxShadow = 'var(--shadow-glow-red)';
            setTimeout(() => {
                $inputEmail.style.borderColor = '';
                $inputEmail.style.boxShadow = '';
            }, 1500);
            return;
        }

        const name = $inputName.value.trim();
        const comment = $inputComment.value.trim();
        const category = getSelectedCategory();

        if (editingId) {
            // Update existing
            const mail = mails.find(m => m.id === editingId);
            if (mail) {
                mail.email = email;
                mail.name = name;
                mail.comment = comment;
                mail.category = category;
            }
        } else {
            // Add new
            mails.unshift({
                id: generateId(),
                email,
                name,
                category,
                status: 'unchecked',
                comment,
                createdAt: Date.now()
            });
        }

        saveMails();
        closeAddModal();
        render();
    }

    function resetCategoryPicker(selected) {
        $categoryPicker.querySelectorAll('.category-chip').forEach(chip => {
            chip.classList.toggle('active', chip.dataset.category === selected);
        });
    }

    function openCommentModal(id) {
        const mail = mails.find(m => m.id === id);
        if (!mail) return;

        commentingId = id;
        $commentEmailPreview.textContent = mail.email;
        $commentTextarea.value = mail.comment || '';
        $commentOverlay.classList.remove('hidden');
        setTimeout(() => $commentTextarea.focus(), 400);
    }

    function closeCommentModal() {
        $commentOverlay.classList.add('hidden');
        commentingId = null;
    }

    function saveComment() {
        if (!commentingId) return;
        const mail = mails.find(m => m.id === commentingId);
        if (mail) {
            mail.comment = $commentTextarea.value.trim();
            saveMails();
            render();
        }
        closeCommentModal();
    }

    function openDeleteModal(id) {
        const mail = mails.find(m => m.id === id);
        if (!mail) return;

        deletingId = id;
        $deleteEmailText.textContent = mail.email;
        $deleteOverlay.classList.remove('hidden');
    }

    function closeDeleteModal() {
        $deleteOverlay.classList.add('hidden');
        deletingId = null;
    }

    function confirmDelete() {
        if (!deletingId) return;

        const card = document.querySelector(`.mail-item[data-id="${deletingId}"]`);
        if (card) {
            card.classList.add('removing');
            setTimeout(() => {
                mails = mails.filter(m => m.id !== deletingId);
                saveMails();
                render();
                closeDeleteModal();
            }, 350);
        } else {
            mails = mails.filter(m => m.id !== deletingId);
            saveMails();
            render();
            closeDeleteModal();
        }
    }

    // ===== FILTER =====
    function toggleFilters() {
        filtersVisible = !filtersVisible;
        $filterTabs.classList.toggle('visible', filtersVisible);
        $mailList.classList.toggle('filters-open', filtersVisible);
        $btnFilter.style.color = filtersVisible ? 'var(--accent-blue)' : '';
        $btnFilter.style.background = filtersVisible ? 'rgba(94, 114, 228, 0.15)' : '';
    }

    function setFilter(filter) {
        currentFilter = filter;
        $filterTabs.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.filter === filter);
        });
        render();
    }

    // ===== EVENT LISTENERS =====

    // Add button
    $btnAdd.addEventListener('click', openAddModal);

    // Filter button
    $btnFilter.addEventListener('click', toggleFilters);

    // Modal cancel / save
    $modalCancel.addEventListener('click', closeAddModal);
    $modalSave.addEventListener('click', saveModal);

    // Comment modal
    $commentCancel.addEventListener('click', closeCommentModal);
    $commentSave.addEventListener('click', saveComment);

    // Delete modal
    $deleteCancelBtn.addEventListener('click', closeDeleteModal);
    $deleteConfirm.addEventListener('click', confirmDelete);

    // Close modals on overlay click
    $modalOverlay.addEventListener('click', (e) => {
        if (e.target === $modalOverlay) closeAddModal();
    });
    $commentOverlay.addEventListener('click', (e) => {
        if (e.target === $commentOverlay) closeCommentModal();
    });
    $deleteOverlay.addEventListener('click', (e) => {
        if (e.target === $deleteOverlay) closeDeleteModal();
    });

    // Category picker
    $categoryPicker.addEventListener('click', (e) => {
        const chip = e.target.closest('.category-chip');
        if (!chip) return;
        $categoryPicker.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
    });

    // Filter tabs
    $filterTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.filter-tab');
        if (!tab) return;
        setFilter(tab.dataset.filter);
    });

    // Search
    $searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        render();
    });

    // Delegate clicks on mail list
    $container.addEventListener('click', (e) => {
        // Checkbox
        const checkbox = e.target.closest('.mail-checkbox');
        if (checkbox) {
            toggleStatus(checkbox.dataset.id);
            return;
        }

        // Comment button
        const commentBtn = e.target.closest('.comment-btn');
        if (commentBtn) {
            openCommentModal(commentBtn.dataset.id);
            return;
        }

        // Delete button
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            openDeleteModal(deleteBtn.dataset.id);
            return;
        }

        // Click on mail-info → edit
        const mailInfo = e.target.closest('.mail-info');
        if (mailInfo) {
            const card = mailInfo.closest('.mail-item');
            if (card) openEditModal(card.dataset.id);
        }
    });

    // Keyboard: Enter to save in modals
    $inputEmail.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') $inputName.focus();
    });
    $inputName.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveModal();
    });

    // ===== SWIPE TO DELETE (touch) =====
    let touchStartX = 0;
    let touchStartY = 0;
    let swiping = false;
    let swipeCard = null;

    $container.addEventListener('touchstart', (e) => {
        const card = e.target.closest('.mail-item');
        if (!card) return;
        // Don't initiate swipe on buttons
        if (e.target.closest('button')) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        swipeCard = card;
        swiping = false;
    }, { passive: true });

    $container.addEventListener('touchmove', (e) => {
        if (!swipeCard) return;
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;

        // Determine direction
        if (!swiping && Math.abs(dx) > 15 && Math.abs(dx) > Math.abs(dy)) {
            swiping = true;
        }

        if (swiping && dx < 0) {
            const offset = Math.max(dx, -120);
            swipeCard.style.transform = `translateX(${offset}px)`;
            swipeCard.style.transition = 'none';
        }
    }, { passive: true });

    $container.addEventListener('touchend', () => {
        if (!swipeCard) return;
        if (swiping) {
            const currentTransform = swipeCard.style.transform;
            const match = currentTransform.match(/translateX\(([-\d.]+)px\)/);
            const offset = match ? parseFloat(match[1]) : 0;

            swipeCard.style.transition = 'transform 0.3s ease';
            if (offset < -80) {
                // Delete
                const id = swipeCard.dataset.id;
                openDeleteModal(id);
            }
            swipeCard.style.transform = '';
        }
        swipeCard = null;
        swiping = false;
    });

    // ===== INIT =====
    render();

    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    }
})();
