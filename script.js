// Mock Data Store
const inventoryData = [
    {
        room: 'Living Room',
        storage: [
            {
                name: 'Media Cabinet',
                items: [
                    { id: 101, name: 'Sony Bravia TV', qty: 1, category: 'Electronics', tags: ['Warranty'] },
                    { id: 102, name: 'PlayStation 5', qty: 1, category: 'Electronics', tags: ['Gaming'] },
                    { id: 103, name: 'HDMI Cables', qty: 4, category: 'Accessories' }
                ]
            },
            {
                name: 'Bookshelf',
                items: [
                    { id: 104, name: 'Ceramic Vase', qty: 1, category: 'Decor', tags: ['Fragile', 'Vintage'] },
                    { id: 105, name: 'Art Books', qty: 12, category: 'Books' }
                ]
            }
        ]
    },
    {
        room: 'Garage',
        storage: [
            {
                name: 'Tool Chest',
                items: [
                    { id: 201, name: 'Hammer', qty: 1, category: 'Tools' },
                    { id: 202, name: 'Screwdriver Set', qty: 1, category: 'Tools' },
                    { id: 203, name: 'Drill', qty: 1, category: 'Tools', tags: ['Battery'] }
                ]
            },
            {
                name: 'Wall Rack',
                items: [
                    { id: 204, name: 'Bicycle', qty: 2, category: 'Sports', tags: ['Outdoor'] }
                ]
            }
        ]
    },
    {
        room: 'Kitchen',
        storage: [
            {
                name: 'Pantry',
                items: [ 
                    { id: 301, name: 'Stand Mixer', qty: 1, category: 'Appliances' } 
                ]
            }
        ]
    }
];

// App State
const state = {
    currentView: 'view-dashboard',
    history: []
};

// DOM Elements
const views = {
    dashboard: document.getElementById('view-dashboard'),
    inventory: document.getElementById('view-inventory'),
    details: document.getElementById('view-details')
};

const navItems = document.querySelectorAll('.nav-item');
const inventoryListEl = document.getElementById('inventory-list');
const pageTitle = document.getElementById('page-title');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    renderInventory();
    setupNavigation();
    setupActions();
});

function setupNavigation() {
    navItems.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = btn.dataset.target;
            if (targetId) {
                switchView(targetId);
                // Update Nav UI
                navItems.forEach(n => n.classList.remove('active'));
                btn.classList.add('active');
            }
        });
    });

    document.getElementById('btn-back-details').addEventListener('click', () => {
        // Simple back logic
        switchView('view-inventory'); // Or history based
    });
}

function switchView(viewId) {
    // Hide all
    Object.values(views).forEach(el => el.classList.remove('active'));
    
    // Show target
    const target = document.getElementById(viewId);
    if (target) {
        target.classList.add('active');
        state.currentView = viewId;
        
        // Update Header Title based on view
        if(viewId === 'view-dashboard') pageTitle.textContent = 'Dashboard';
        if(viewId === 'view-inventory') pageTitle.textContent = 'Inventory';
        if(viewId === 'view-details') pageTitle.textContent = 'Item Details';
    }
}

function renderInventory() {
    inventoryListEl.innerHTML = ''; // Clear

    inventoryData.forEach(room => {
        const roomEl = document.createElement('div');
        roomEl.className = 'room-group';
        
        let storageHtml = '';
        room.storage.forEach(unit => {
            let itemsHtml = '';
            unit.items.forEach(item => {
                itemsHtml += `
                    <div class="item-row" onclick="viewItemDetails(${item.id}, '${room.room}', '${unit.name}')">
                        <span>${item.name}</span>
                        <span class="item-badge">${item.qty}</span>
                    </div>
                `;
            });

            storageHtml += `
                <div class="storage-unit">
                    <div class="storage-header">${unit.name}</div>
                    ${itemsHtml}
                </div>
            `;
        });

        roomEl.innerHTML = `
            <div class="room-header">${room.room}</div>
            ${storageHtml}
        `;
        
        inventoryListEl.appendChild(roomEl);
    });
}

// Global scope for onclick reference (hacky but simple)
window.viewItemDetails = function(id, roomName, storageName) {
    // Find item data
    let foundItem = null;
    // Flatten search
    inventoryData.forEach(r => {
        r.storage.forEach(s => {
            const item = s.items.find(i => i.id === id);
            if(item) foundItem = item;
        });
    });

    if(!foundItem) return;

    // Populate Details View
    const container = document.getElementById('view-details');
    container.querySelector('.detail-name').textContent = foundItem.name;
    container.querySelector('.value').textContent = foundItem.qty; // simple selector, implies first .value
    
    // Update Breadcrumb
    const breadcrumb = container.querySelector('.breadcrumb');
    breadcrumb.innerHTML = `
        <span class="crumb">${roomName}</span>
        <span class="separator">/</span>
        <span class="crumb highlight">${storageName}</span>
    `;

    // Category
    // Finding specific elements by index is risky, let's target by text content logic or specific classes if needed. 
    // In the HTML structure: 3rd detail-row is Category. 
    // Let's just re-render the detail rows to be safe or use more specific IDs. 
    // For this demo validation, I'll update the specific structure I built.
    const rows = container.querySelectorAll('.detail-row');
    if(rows[2]) rows[2].querySelector('.value').textContent = foundItem.category || 'General';

    // Tags
    const tagsContainer = container.querySelector('.tags-row');
    tagsContainer.innerHTML = '';
    if(foundItem.tags) {
        foundItem.tags.forEach(tag => {
            const span = document.createElement('span');
            span.className = 'tag';
            span.textContent = tag;
            tagsContainer.appendChild(span);
        });
    }

    switchView('view-details');
};

function setupActions() {
    const scanBtn = document.getElementById('btn-scan');
    scanBtn.addEventListener('click', () => {
        // Visual feedback
        scanBtn.style.transform = 'scale(0.95)';
        setTimeout(() => scanBtn.style.transform = 'scale(1)', 150);
        
        console.log('Opening Camera Interface...');
        // In a real PWA this would trigger navigator.mediaDevices.getUserMedia
    });
}
