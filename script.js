// === НАСТРОЙКИ ===
const API_URL = 'https://sheetdb.io/api/v1/fup4s2y4l1pqe'; 

const tableBody = document.getElementById('tableBody');
const searchInput = document.getElementById('searchInput');
const noResultsDiv = document.getElementById('no-results');
const btnSearch = document.getElementById('btnSearch');
const tableHead = document.querySelector('#blacklistTable thead');
const table = document.getElementById('blacklistTable');

// === ЛОКАЛИЗАЦИЯ (I18N) ===
const translations = {
    ru: {
        page_title: "EVE Online: Корпоративный Blacklist",
        support_header: "Проект поддерживается сообществом.",
        support_desc_ru: "Для работы сервиса создатель тратит своё личное время. Любая помощь важна для покрытия расходов на домен и стабильность работы.",
        support_in_game_header: "💠 Внутриигровая помощь (ISK)",
        support_in_game_sub: "Перевод на персонажа:",
        support_crypto_header: "💸 Криптовалюта",
        support_crypto_sub: "Кошелёк:",
        btn_discord: "Обсудить в Discord",
        col_name: "Имя персонажа",
        col_date: "Дата добавления",
        col_reason: "Причина",
        col_evidence: "Доказательства",
        col_status: "Статус",
        search_hint: "Поиск нечувствителен к регистру и ищет по любому совпадению в колонке имени.",
        msg_not_found: "Персонаж с таким именем не найден в корпоративном списке.",
        footer_ru: "Данные загружаются из Google Таблицы. Правки вносит только администратор.",
        evidence_link_text: "Ссылка",
        status_active: "Активен",
        status_removed: "Удален/Заблокирован",
        btn_search: "Искать"
    },
    en: {
        page_title: "EVE Online: Corporate Blacklist",
        support_header: "Project is community-supported.",
        support_desc_en: "The creator spends personal time to maintain this service. Any help is important to cover domain costs and ensure stability.",
        support_in_game_header: "💠 In-game Help (ISK)",
        support_in_game_sub: "Transfer to character:",
        support_crypto_header: "💸 Cryptocurrency",
        support_crypto_sub: "Wallet:",
        btn_discord: "Discuss on Discord",
        col_name: "Character Name",
        col_date: "Date Added",
        col_reason: "Reason",
        col_evidence: "Evidence",
        col_status: "Status",
        search_hint: "Search is case-insensitive and matches any part of the name column.",
        msg_not_found: "No character found with that name in the corporate list.",
        footer_en: "Data is loaded from Google Sheets. Only the administrator can make edits.",
        evidence_link_text: "Link",
        status_active: "Active",
        status_removed: "Removed/Blocked",
        btn_search: "Search"
    }
};

// === ЗАЩИТА ОТ XSS ===
function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// === ПЕРЕКЛЮЧЕНИЕ ЯЗЫКА ===
function setLang(lang) {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key.startsWith('support_desc_') || key.startsWith('footer_')) {
            if (key === 'support_desc_ru' || key === 'footer_ru') {
                el.style.display = lang === 'ru' ? 'inline' : 'none';
            } else {
                el.style.display = lang === 'en' ? 'inline' : 'none';
            }
        } else {
            el.textContent = translations[lang][key];
        }
    });

    searchInput.placeholder = lang === 'ru' 
        ? "Введите имя персонажа для поиска"
        : "Enter character name to search";

    localStorage.setItem('eve-blacklist-lang', lang);

    document.querySelectorAll('.btn-lang').forEach(btn => {
        btn.classList.toggle('active', btn.textContent === lang.toUpperCase());
    });

    updateTableHeaders(lang);

    if (window.blacklistData) {
        renderTable(window.blacklistData, lang);
    }
}

function updateTableHeaders(lang) {
    const headers = tableHead.querySelectorAll('th');
    headers[0].textContent = translations[lang]['col_name'];
    headers[1].textContent = translations[lang]['col_date'];
    headers[2].textContent = translations[lang]['col_reason'];
    headers[3].textContent = translations[lang]['col_evidence'];
    headers[4].textContent = translations[lang]['col_status'];
}

document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('eve-blacklist-lang') || 'ru';
    setLang(savedLang);
});

// === ЗАГРУЗКА ДАННЫХ (только по нажатию кнопки) ===
let dataLoaded = false;

async function loadDataOnce() {
    if (dataLoaded) return;
    dataLoaded = true;

    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Ошибка сети');
        const data = await response.json();
        window.blacklistData = data;
        const currentLang = localStorage.getItem('eve-blacklist-lang') || 'ru';
        renderTable(data, currentLang);
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">Не удалось загрузить данные. Проверьте консоль или ссылку API.</td></tr>';
        table.classList.add('visible');
    }
}

// === ОТРИСОВКА ТАБЛИЦЫ С ФИЛЬТРАЦИЕЙ ===
function renderTable(data, lang) {
    tableBody.innerHTML = '';
    const t = translations[lang];
    const query = (searchInput.value || '').toLowerCase().trim();

    let visibleCount = 0;

    data.forEach(row => {
        let name = row.character_name || 'Не указано';
        let date = row.added_date || '-';
        let reason = row.reason || '-';
        let evidence = row.evidence_link || '-';
        let status = row.status || '';

        const statusText = (status || '').trim().toLowerCase();
        const isActive = statusText === 'активен' || statusText === 'active';
        const statusClass = isActive ? 'status-active' : 'status-removed';
        const statusDisplay = isActive ? t.status_active : t.status_removed;

        let evidenceCell = '-';
        if (evidence && evidence.trim() !== '') {
            evidenceCell = `<a href="${escapeHtml(evidence)}" target="_blank" rel="noopener noreferrer" class="evidence-link">${t.evidence_link_text}</a>`;
        }

        // Фильтрация по имени прямо при отрисовке
        const nameLower = name.toLowerCase();
        const show = !query || nameLower.includes(query);

        if (show) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${escapeHtml(name)}</strong></td>
                <td>${escapeHtml(date)}</td>
                <td style="max-width:250px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(reason)}</td>
                <td>${evidenceCell}</td>
                <td class="${statusClass}">${statusDisplay}</td>
            `;
            tableBody.appendChild(tr);
            visibleCount++;
        }
    });

    // Показываем таблицу только если есть совпадения
    table.classList.toggle('visible', visibleCount > 0);
    noResultsDiv.style.display = visibleCount === 0 && query !== '' ? 'block' : 'none';
}

// === ОБРАБОТЧИК КНОПКИ «ИСКАТЬ» ===
btnSearch.addEventListener('click', () => {
    loadDataOnce(); // загружаем один раз, дальше берём из памяти
});

// Переключатель языка — не грузит данные, ждём кнопку «Искать»
document.querySelectorAll('.btn-lang').forEach(btn => {
    btn.addEventListener('click', () => {
        // ничего не грузим, просто меняем тексты
    });
});
