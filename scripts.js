// global variables to store state
let heroes = [];
let filteredHeroes = [];
let currentPage = 1;
let pageSize = 20;
let sortConfig = { key: 'name', direction: 'asc' };

// dom elements we'll use frequently
const searchInput = document.getElementById('search');
const pageSizeSelect = document.getElementById('pageSize');
const heroBody = document.getElementById('heroBody');
const pagination = document.getElementById('pagination');
const modal = document.getElementById('heroModal');
const modalContent = document.getElementById('modalContent');

// fetch and initialize data
async function init() {
    try {
        const response = await fetch('https://rawcdn.githack.com/akabab/superhero-api/0.2.0/api/all.json');
        heroes = await response.json();
        filteredHeroes = [...heroes];
        // console.log("[filteredHeroes]",filteredHeroes);
        setupEventListeners();
        renderTable();
    } catch (error) {
        console.error('Failed to fetch heroes:', error);
    }
}

// set up all event listeners
// [event listeners](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)
function setupEventListeners() {
    // search input
    searchInput.addEventListener('input', function (e) {
        const searchTerm = e.target.value.toLowerCase();
        filteredHeroes = heroes.filter(hero =>
            hero.name.toLowerCase().includes(searchTerm) ||
            (hero.biography.fullName && hero.biography.fullName.toLowerCase().includes(searchTerm))
        );
        currentPage = 1;
        renderTable();
    });

    // page size select
    pageSizeSelect.addEventListener('change', function (e) {
        pageSize = e.target.value;
        currentPage = 1;
        renderTable();
    });

    // sort headers
    document.querySelectorAll('th[data-sort]').forEach(header => {
        header.addEventListener('click', () => handleSort(header.dataset.sort));
    });

    // close modal when clicking outside
    window.onclick = function (event) {
        if (event.target === modal) {
            closeModal();
        }
    };
}

// sorting function
function handleSort(key) {
    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    sortConfig = { key, direction };

    // update header styles
    document.querySelectorAll('th[data-sort]').forEach(header => {
        header.classList.remove('sorted', 'desc');
        if (header.dataset.sort === key) {
            header.classList.add('sorted');
            if (direction === 'desc') header.classList.add('desc');
        }
    });

    // sort the heroes
    filteredHeroes.sort((a, b) => {
        let valueA, valueB;

        if (key === 'powerstats') {
            // calculate average power stats
            valueA = Object.values(a.powerstats).reduce((sum, val) => sum + val, 0) / Object.keys(a.powerstats).length;
            valueB = Object.values(b.powerstats).reduce((sum, val) => sum + val, 0) / Object.keys(b.powerstats).length;
        } else {
            // get nested values (e.g., biography.fullName)
            valueA = key.split('.').reduce((obj, k) => obj?.[k], a) || '';
            valueB = key.split('.').reduce((obj, k) => obj?.[k], b) || '';
        }

        // move null/N/A values to the end
        if (!valueA && !valueB) return 0;
        if (!valueA) return 1;
        if (!valueB) return -1;

        // compare values
        if (typeof valueA === 'number') {
            return direction === 'asc' ? valueA - valueB : valueB - valueA;
        }

        // console.log("[valueA]",valueA,"[valueB]",valueB);

        return direction === 'asc' ?
            valueA.toString().localeCompare(valueB.toString()) :
            valueB.toString().localeCompare(valueA.toString());
    });

    renderTable();
}

// render the main table
function renderTable() {
    heroBody.innerHTML = '';

    // calculate which heroes to show
    const start = pageSize === 'all' ? 0 : (currentPage - 1) * pageSize;
    const end = pageSize === 'all' ?
        filteredHeroes.length :
        Math.min(start + parseInt(pageSize), filteredHeroes.length);

    const heroesToShow = filteredHeroes.slice(start, end);

    // create table rows
    heroesToShow.forEach(hero => {
        const row = document.createElement('tr');
        row.onclick = () => showHeroDetails(hero);

        const alignmentClass = hero.biography.alignment === 'good' ? 'alignment-good' :
            hero.biography.alignment === 'bad' ? 'alignment-bad' :
                'alignment-neutral';

        // sort and format powerstats
        const powerstats = Object.entries(hero.powerstats)
            .sort((a, b) => b[1] - a[1]) // sort by value, highest first
            .map(([key, value]) => `
                        <div class="powerstat">
                            <span class="powerstat-label">${key}:</span>
                            <span class="powerstat-value">${value}</span>
                        </div>
                    `).join('');

        row.innerHTML = `
                    <td><img src="${hero.images.xs}" alt="${hero.name}" class="hero-img"></td>
                    <td>${hero.name}</td>
                    <td>${hero.biography.fullName || 'N/A'}</td>
                    <td class="powerstats-cell">
                        <div class="powerstats">
                            ${powerstats}
                        </div>
                    </td>
                    <td>${hero.appearance.race || 'N/A'}</td>
                    <td>${hero.appearance.gender || 'N/A'}</td>
                    <td>${hero.appearance.height ? hero.appearance.height.join(' / ') : 'N/A'}</td>
                    <td>${hero.appearance.weight ? hero.appearance.weight.join(' / ') : 'N/A'}</td>
                    <td>${hero.biography.placeOfBirth || 'N/A'}</td>
                    <td><span class="alignment-badge ${alignmentClass}">${hero.biography.alignment || 'N/A'}</span></td>
                `;
        heroBody.appendChild(row);

        // console.log("[RENDERTABLE - heroBody]",heroBody);

    });

    renderPagination();
}

// render pagination controls
function renderPagination() {
    pagination.innerHTML = '';

    if (pageSize === 'all') return;

    const totalPages = Math.ceil(filteredHeroes.length / pageSize);
    if (totalPages <= 1) return;

    // previous button
    const prevButton = document.createElement('button');
    prevButton.textContent = 'Previous';
    prevButton.className = 'page-button';
    prevButton.disabled = currentPage === 1;
    prevButton.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    };
    pagination.appendChild(prevButton);

    // pagination numbers
    for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.className = 'page-button';
        if (i === currentPage) pageButton.classList.add('active');
        pageButton.onclick = () => {
            currentPage = i;
            renderTable();
        };
        pagination.appendChild(pageButton);
    }

    // next button
    const nextButton = document.createElement('button');
    nextButton.textContent = 'Next';
    nextButton.className = 'page-button';
    nextButton.disabled = currentPage === totalPages;
    nextButton.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
        }
    };
    pagination.appendChild(nextButton);
}

// show hero details in modal
function showHeroDetails(hero) {
    const alignmentClass = hero.biography.alignment === 'good' ? 'alignment-good' :
        hero.biography.alignment === 'bad' ? 'alignment-bad' :
            'alignment-neutral';

    modalContent.innerHTML = `
                <div class="hero-details">
                    <div>
                        <img src="${hero.images.lg}" alt="${hero.name}" class="hero-image">
                    </div>
                    <div class="hero-info">
                        <div class="info-section">
                            <h2>${hero.name}</h2>
                            ${hero.biography.fullName ? `<p>${hero.biography.fullName}</p>` : ''}
                        </div>

                        <div class="info-section">
                            <h3>Power Stats</h3>
                            <div class="info-grid">
                                ${Object.entries(hero.powerstats)
            .sort(([, a], [, b]) => b - a)
            .map(([key, value]) => `
                                        <div class="powerstat">
                                            <span class="powerstat-label">${key}:</span>
                                            <span class="powerstat-value">${value}</span>
                                        </div>
                                    `).join('')}
                            </div>
                        </div>

                        <div class="info-section">
                            <h3>Appearance</h3>
                            <div class="info-grid">
                                <div class="info-item">
                                    <span class="info-label">Race</span>
                                    <span class="info-value">${hero.appearance.race || 'N/A'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Gender</span>
                                    <span class="info-value">${hero.appearance.gender || 'N/A'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Height</span>
                                    <span class="info-value">${hero.appearance.height ? hero.appearance.height.join(' / ') : 'N/A'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Weight</span>
                                    <span class="info-value">${hero.appearance.weight ? hero.appearance.weight.join(' / ') : 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        <div class="info-section">
                            <h3>Biography</h3>
                            <div class="info-grid">
                                <div class="info-item">
                                    <span class="info-label">Place of Birth</span>
                                    <span class="info-value">${hero.biography.placeOfBirth || 'N/A'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">First Appearance</span>
                                    <span class="info-value">${hero.biography.firstAppearance || 'N/A'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Publisher</span>
                                    <span class="info-value">${hero.biography.publisher || 'N/A'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Alignment</span>
                                    <span class="info-value ${alignmentClass}">${hero.biography.alignment || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// close modal function
function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = '';
}

// start the application
init();
