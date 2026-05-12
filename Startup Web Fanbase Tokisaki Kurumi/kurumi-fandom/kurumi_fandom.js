// ===== RUNTUTAN (SEQUENCE): Inisialisasi DOM Elements =====
document.addEventListener('DOMContentLoaded', function() {
    // SEQUENCE: Mengambil referensi semua elemen DOM yang diperlukan
    const expandBtn = document.querySelector('.expand-btn');
    const contentsBtn = document.querySelector('.contents-btn');
    const viewSourceBtn = document.querySelector('.view-source-btn');
    const pageContents = document.getElementById('page-contents');
    const modalCloseBtn = document.querySelector('.modal-close-btn');
    const viewContent = document.getElementById('view-content');
    const renderedOutput = document.getElementById('rendered-output');
    const sourceEditor = document.getElementById('source-editor');
    const editorContent = document.getElementById('editor-content');
    const saveBtn = document.querySelector('.save-btn');
    const cancelBtn = document.querySelector('.cancel-btn');
    const saveChangesBtn = document.querySelector('.save-changes-btn');
    const discardChangesBtn = document.querySelector('.discard-changes-btn');
    const sectionSelector = document.getElementById('section-selector');
    const addSectionBtn = document.getElementById('add-section-btn');
    const deleteSectionBtn = document.getElementById('delete-section-btn');
    const searchForm = document.querySelector('.search-form');
    const searchInput = document.querySelector('.search-form input');
    const mainElement = document.querySelector('main');
    const articleElement = document.querySelector('article.page-article');
    const resetContentBtn = document.getElementById('reset-content-btn');
    const defaultArticleState = articleElement.innerHTML;

    // Sign In elements
    const signinIcon = document.querySelector('.signin-icon');
    const signinModal = new bootstrap.Modal(document.getElementById('signin-modal'));
    const signinForm = document.getElementById('signin-form');
    const signinName = document.getElementById('signin-name');
    const signinPassword = document.getElementById('signin-password');
    const signinError = document.getElementById('signin-error');

    let isLoggedIn = false;

    // ===== SEQUENCE: Fungsi-Fungsi Pendukung =====
    // SEQUENCE: Fungsi untuk escape HTML characters
    function escapeHtml(text) {
        return text.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function escapeHtml(text) {
        return text.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function renderWikiText(rawText) {
        let text = rawText.replace(/<br\s*\/?>/gi, '[[BR]]');
        text = escapeHtml(text);
        text = text.replace(/\[\[BR\]\]/g, '<br>');
        text = text.replace(/<ref[^>]*>.*?<\/ref>/gi, '');
        text = text.replace(/<ref[^>]*\/?>/gi, '');
        text = text.replace(/\{\{[^}]+\}\}/g, '');

        const lines = text.split('\n');
        let html = '';
        let inList = false;
        let inTable = false;

        function closeList() {
            if (inList) {
                html += '</ul>';
                inList = false;
            }
        }

        function closeTable() {
            if (inTable) {
                html += '</table>';
                inTable = false;
            }
        }

        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) {
                closeList();
                closeTable();
                html += '<p></p>';
                return;
            }

            const headingMatch = trimmed.match(/^(={2,6})\s*(.+?)\s*\1$/);
            if (headingMatch) {
                closeList();
                closeTable();
                const level = headingMatch[1].length;
                const tag = 'h' + Math.min(level, 5);
                html += `<${tag}>${headingMatch[2]}</${tag}>`;
                return;
            }

            if (/^\*\s+/.test(trimmed)) {
                closeTable();
                if (!inList) {
                    html += '<ul>';
                    inList = true;
                }
                let item = trimmed.replace(/^\*\s+/, '');
                item = item.replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '<a href="#">$2</a>');
                item = item.replace(/\[\[([^\]]+)\]\]/g, '<a href="#">$1</a>');
                item = item.replace(/'''(.*?)'''/g, '<strong>$1</strong>');
                item = item.replace(/''(.*?)''/g, '<em>$1</em>');
                html += `<li>${item}</li>`;
                return;
            }

            const tableMatch = trimmed.match(/^\|\s*([^=|]+?)\s*=\s*(.+)$/);
            if (tableMatch) {
                closeList();
                if (!inTable) {
                    html += '<table class="wiki-table">';
                    inTable = true;
                }
                const key = tableMatch[1].trim();
                const value = tableMatch[2].trim();
                html += `<tr><th>${key}</th><td>${value}</td></tr>`;
                return;
            }

            closeList();
            closeTable();

            let lineContent = trimmed
                .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '<a href="#">$2</a>')
                .replace(/\[\[([^\]]+)\]\]/g, '<a href="#">$1</a>')
                .replace(/'''''(.*?)'''''/g, '<strong><em>$1</em></strong>')
                .replace(/'''(.*?)'''/g, '<strong>$1</strong>')
                .replace(/''(.*?)''/g, '<em>$1</em>')
                .replace(/^:''\s*(.*)$/g, '<blockquote>$1</blockquote>');

            if (/^:\s*(.+)$/.test(trimmed)) {
                lineContent = trimmed.replace(/^:\s*(.+)$/, '<blockquote>$1</blockquote>');
            }

            html += `<p>${lineContent}</p>`;
        });

        closeList();
        closeTable();
        return html;
    }

    function sanitizeId(title) {
        return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'section';
    }

    function saveArticleState() {
        localStorage.setItem('kurumi-fandom-article', articleElement.innerHTML);
    }

    function loadArticleState() {
        const savedArticle = localStorage.getItem('kurumi-fandom-article');
        if (savedArticle !== null) {
            articleElement.innerHTML = savedArticle;
        }
    }

    // ===== MENAMPILKAN DAFTAR DATA (DATA LIST) =====
    // SEQUENCE: Fungsi untuk memuat dan menampilkan daftar section
    function loadSectionList() {
        const sections = articleElement.querySelectorAll('section[id]');
        sectionSelector.innerHTML = '';

        // LOOPING: Iterasi melalui setiap section untuk menampilkannya di dropdown
        sections.forEach(section => {
            const title = section.querySelector('h2')?.textContent || section.id;
            const option = document.createElement('option');
            option.value = section.id;
            option.textContent = title;
            sectionSelector.appendChild(option);
        });

        // PERCABANGAN (IF/ELSE): Cek apakah ada section atau tidak
        if (sections.length > 0) {
            sectionSelector.disabled = false;
            sectionSelector.selectedIndex = 0;
            loadSelectedSection();
        } else {
            sectionSelector.disabled = true;
            editorContent.value = '';
        }
    }

    function loadSelectedSection() {
        const selectedSection = document.getElementById(sectionSelector.value);
        if (!selectedSection) {
            editorContent.value = '';
            return;
        }

        const heading = selectedSection.querySelector('h2');
        const sectionBody = Array.from(selectedSection.childNodes)
            .slice(1)
            .map(node => node.outerHTML || node.textContent)
            .join('');

        editorContent.value = sectionBody.trim();
    }

    function updateSelectedSection() {
        const selectedSection = document.getElementById(sectionSelector.value);
        if (!selectedSection) return;

        const heading = selectedSection.querySelector('h2');
        let newBody = editorContent.value.trim();

        // Jika pengguna memasukkan judul section lagi di textarea,
        // hapus heading tersebut agar tidak dobel saat disimpan.
        newBody = newBody.replace(/^\s*<h[1-6][^>]*>.*?<\/h[1-6]>\s*/i, '').trim();

        selectedSection.innerHTML = heading.outerHTML + newBody;
        saveArticleState();
        alert('Perubahan section berhasil disimpan.');
    }

    function deleteSelectedSection() {
        const selectedSection = document.getElementById(sectionSelector.value);
        if (!selectedSection) return;

        const sectionTitle = selectedSection.querySelector('h2')?.textContent || selectedSection.id;
        if (confirm(`Hapus section "${sectionTitle}"?`)) {
            selectedSection.remove();
            saveArticleState();
            loadSectionList();
            alert('Section berhasil dihapus.');
        }
    }

    // ===== VALIDASI INPUT & PERCABANGAN (IF/ELSE) =====
    // SEQUENCE: Fungsi untuk menambah section baru
    function addNewSection() {
        const title = prompt('Masukkan judul section baru:');
        // VALIDASI INPUT: Cek apakah user membatalkan atau input kosong
        if (!title) return;

        let id = sanitizeId(title);
        let index = 1;
        // PERULANGAN (LOOPING - WHILE): Cari ID unik untuk section
        while (document.getElementById(id)) {
            id = `${sanitizeId(title)}-${index}`;
            index += 1;
        }

        const newSection = document.createElement('section');
        newSection.id = id;
        newSection.innerHTML = `<h2>${title}</h2><p>Konten baru dapat diedit di sini.</p>`;

        const referencesSection = articleElement.querySelector('#references');
        if (referencesSection) {
            articleElement.insertBefore(newSection, referencesSection);
        } else {
            articleElement.appendChild(newSection);
        }

        saveArticleState();
        loadSectionList();
        sectionSelector.value = id;
        loadSelectedSection();
        alert(`Section "${title}" berhasil ditambahkan.`);
    }

    loadArticleState();
    loadSectionList();

    // Sign In functions
    function showSigninModal() {
        signinModal.show();
        signinName.focus();
    }

    function hideSigninModal() {
        signinModal.hide();
        signinError.classList.add('hidden');
        signinForm.reset();
    }

    // ===== VALIDASI INPUT & PERCABANGAN (IF/ELSE) =====
    // SEQUENCE: Fungsi untuk menangani proses sign in
    function handleSignin(e) {
        e.preventDefault();
        const name = signinName.value.trim();
        const password = signinPassword.value.trim();

        // VALIDASI INPUT: Cek apakah nama dan password tidak kosong
        if (!name || !password) {
            signinError.textContent = 'Nama dan password tidak boleh kosong!';
            signinError.classList.remove('hidden');
            return;
        }

        // Validasi berhasil
        isLoggedIn = true;
        signinIcon.textContent = '👤';
        signinIcon.classList.add('logged-in');
        signinIcon.title = 'Logged in as ' + name;
        hideSigninModal();
        alert('Sign in berhasil! Selamat datang, ' + name + '!');
    }

    function checkLoginForEdit() {
        if (!isLoggedIn) {
            alert('Silakan masuk terlebih dahulu untuk mengedit konten.');
            showSigninModal();
            return false;
        }
        return true;
    }

    expandBtn.addEventListener('click', function() {
        mainElement.classList.toggle('expanded');
        expandBtn.classList.toggle('active');
    });

    const pageContentWrapper = document.querySelector('.page-content-wrapper');

    function showDefaultContent() {
        if (pageContentWrapper) {
            pageContentWrapper.classList.remove('hidden');
        }
        sourceEditor.classList.add('hidden');
        pageContents.classList.add('hidden');
        viewContent.classList.add('hidden');
        viewSourceBtn.classList.remove('active');
        contentsBtn.classList.remove('active');
    }

    contentsBtn.addEventListener('click', function() {
        pageContents.classList.toggle('hidden');
    });

    modalCloseBtn.addEventListener('click', function() {
        pageContents.classList.add('hidden');
    });

    pageContents.addEventListener('click', function(e) {
        // Close modal when clicking the overlay background
        if (e.target === pageContents) {
            pageContents.classList.add('hidden');
        }
        // Close modal when clicking a link in the TOC
        if (e.target.tagName === 'A') {
            pageContents.classList.add('hidden');
        }
    });

    viewSourceBtn.addEventListener('click', function() {
        if (!checkLoginForEdit()) return;
        sourceEditor.classList.toggle('hidden');
        if (pageContentWrapper) {
            pageContentWrapper.classList.add('hidden');
        }
        pageContents.classList.add('hidden');
        viewContent.classList.add('hidden');
        viewSourceBtn.classList.toggle('active');
        contentsBtn.classList.remove('active');
        if (!sourceEditor.classList.contains('hidden')) {
            loadSectionList();
        }
    });

    // ===== MENAMPILKAN DAFTAR DATA (DATA LIST) & LOOPING =====
    // SEQUENCE: Mengambil daftar tab dan konten infobox
    const infoboxTabs = document.querySelectorAll('.tab-btn');
    const infoboxContents = document.querySelectorAll('.infobox-content');

    // LOOPING: Iterasi setiap tab untuk menambahkan event listener
    function switchInfoboxTab(event) {
        event.preventDefault();
        const targetMode = this.dataset.tab;

        infoboxTabs.forEach(btn => btn.classList.toggle('active', btn === this));
        infoboxContents.forEach(content => {
            content.classList.toggle('hidden', content.dataset.mode !== targetMode);
        });
    }

    infoboxTabs.forEach(tab => {
        tab.addEventListener('click', switchInfoboxTab);
        tab.addEventListener('touchstart', switchInfoboxTab, { passive: true });
    });

    saveBtn.addEventListener('click', function() {
        updateSelectedSection();
    });

    saveChangesBtn.addEventListener('click', function() {
        updateSelectedSection();
    });

    cancelBtn.addEventListener('click', function() {
        showDefaultContent();
    });

    deleteSectionBtn.addEventListener('click', function() {
        deleteSelectedSection();
    });

    addSectionBtn.addEventListener('click', function() {
        addNewSection();
    });

    resetContentBtn.addEventListener('click', function() {
        if (confirm('Kembalikan konten ke tampilan awal dan hapus data tersimpan?')) {
            articleElement.innerHTML = defaultArticleState;
            localStorage.removeItem('kurumi-fandom-article');
            loadSectionList();
            showDefaultContent();
            alert('Konten telah direset ke versi awal.');
        }
    });

    sectionSelector.addEventListener('change', function() {
        loadSelectedSection();
    });

    discardChangesBtn.addEventListener('click', function() {
        loadSectionList();
        showDefaultContent();
        alert('Perubahan dibatalkan');
    });

    // ===== VALIDASI INPUT & PERCABANGAN (IF/ELSE) =====
    // SEQUENCE: Event listener untuk form pencarian
    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const query = searchInput.value.trim().toLowerCase();
        // VALIDASI INPUT: Cek apakah query pencarian tidak kosong
        if (!query) {
            alert('Masukkan kata kunci untuk dicari!');
            return;
        }

        const sections = document.querySelectorAll('main section');
        let found = false;
        let matchedSectionId = null;

        // LOOPING & PERCABANGAN: Iterasi section untuk cari kecocokan query
        sections.forEach(section => {
            const text = section.textContent.toLowerCase();
            const sectionId = section.id;
            // PERCABANGAN (IF): Cek apakah section cocok dengan query pencarian
            if (sectionId && text.includes(query)) {
                found = true;
                if (!matchedSectionId) matchedSectionId = sectionId;
            }
        });

        // PERCABANGAN (IF/ELSE): Tampilkan hasil pencarian atau buka Google
        if (found && matchedSectionId) {
            const targetElement = document.getElementById(matchedSectionId);
            // PERCABANGAN (IF): Cek apakah elemen ditemukan sebelum scroll
            if (targetElement) targetElement.scrollIntoView({ behavior: 'smooth' });
            alert(`Hasil ditemukan di section "${matchedSectionId}"!`);
            searchInput.value = '';
        } else {
            const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
            window.open(googleSearchUrl, '_blank');
            searchInput.value = '';
        }
    });

    // ===== MENAMPILKAN DAFTAR DATA (DATA LIST) & LOOPING =====
    // LOOPING: Iterasi semua link navigasi untuk smooth scroll
    document.querySelectorAll('nav a').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            // PERCABANGAN (IF): Cek apakah href adalah anchor link
            if (href && href.startsWith('#')) {
                e.preventDefault();
                const targetId = href.substring(1);
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });

    // ===== MENAMPILKAN DAFTAR DATA (DATA LIST) & LOOPING =====
    // LOOPING: Iterasi semua gambar di gallery untuk menambah event listener
    document.querySelectorAll('#gallery img').forEach(img => {
        img.addEventListener('click', function() {
            alert('Image: ' + this.alt);
        });
    });

    // Sign In event listeners
    signinIcon.addEventListener('click', function() {
        if (isLoggedIn) {
            // Jika sudah login, mungkin logout atau tidak lakukan apa-apa
            return;
        }
        showSigninModal();
    });

    signinForm.addEventListener('submit', handleSignin);
});