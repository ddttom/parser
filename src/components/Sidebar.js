class Sidebar {
    constructor() {
        // ... existing initialization ...
        this.setupTypeFilter();
    }

    setupTypeFilter() {
        const filterContainer = document.createElement('div');
        filterContainer.className = 'sidebar-filter';
        
        filterContainer.innerHTML = `
            <select id="type-filter">
                <option value="">All Types</option>
                <option value="note">Notes</option>
                <option value="document">Documents</option>
                <option value="template">Templates</option>
                <option value="html">HTML</option>
            </select>
        `;

        const typeFilter = filterContainer.querySelector('#type-filter');
        typeFilter.addEventListener('change', async () => {
            const selectedType = typeFilter.value;
            await this.refreshEntryList({ type: selectedType });
        });

        this.sidebar.insertBefore(filterContainer, this.sidebar.firstChild);
    }

    async refreshEntryList(filter = {}) {
        const entries = await window.api.getEntries(filter);
        // ... existing entry list rendering logic ...
    }
} 
