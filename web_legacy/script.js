// --- SUPABASE SETUP ---
console.log("Initialize Supabase...");
const SUPABASE_URL = 'https://wubtmmdmxwjesytfyogk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1YnRtbWRteHdqZXN5dGZ5b2drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MzQyNDQsImV4cCI6MjA4MTQxMDI0NH0.T_DlLFwHl1mPtddcpXEHMN4AO4Br2oe9XB_oyjcaJmQ';

let supabase;
try {
    // Check if the Supabase SDK is available on the window object
    if (window.supabase && window.supabase.createClient) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } else {
        console.warn('Supabase SDK not loaded. ensure the CDN script is in index.html');
    }
} catch (e) {
    console.error('Supabase Init Error:', e);
}

// Data Store (Will be populated from DB)
let inventoryData = [];

// App State
const state = {
    currentView: 'view-dashboard',
    history: []
};

// DOM Elements
const views = {
    dashboard: document.getElementById('view-dashboard'),
    inventory: document.getElementById('view-inventory'),
    details: document.getElementById('view-details'),
    search: document.getElementById('view-search')
};
const navItems = document.querySelectorAll('.nav-item');
const inventoryListEl = document.getElementById('inventory-list');
const pageTitle = document.getElementById('page-title');

// Modal Elements
const modalReview = document.getElementById('modal-review');
const modalLocation = document.getElementById('modal-location');
const cameraInput = document.getElementById('camera-input');
const reviewImg = document.getElementById('review-img');
const reviewName = document.getElementById('review-name');
const reviewQty = document.getElementById('review-qty');
const reviewCategory = document.getElementById('review-category');

// Location Modal Elements
const selectRoom = document.getElementById('select-room');
const selectStorage = document.getElementById('select-storage');
const btnAddRoom = document.getElementById('btn-add-room');
const btnAddStorage = document.getElementById('btn-add-storage');

let currentReviewItem = {};
let pendingItem = null; // Item waiting for location assignment

// Toast Helper
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="material-symbols-rounded">${type === 'success' ? 'check_circle' : 'error'}</span>
        <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchInventory();
    setupNavigation();
    setupActions();
    setupModal();
});

// --- CORE LOGIC ---

// Fetch Data from Supabase
async function fetchInventory() {
    try {
        console.log("Fetching inventory...");
        // Fetch Rooms with their Storage Units and Items
        const { data, error } = await supabase
            .from('rooms')
            .select(`
                id,
                name,
                storage:storage_units (
                    id,
                    name,
                    items (
                        id,
                        name,
                        quantity,
                        category,
                        image_url,
                        detected_labels
                    )
                )
            `);

        if (error) throw error;

        if (data) {
            console.log("Inventory Loaded:", data);
            // Transform to internal structure
            inventoryData = data.map(r => ({
                id: r.id,
                room: r.name,
                storage: r.storage.map(s => ({
                    id: s.id,
                    name: s.name,
                    items: s.items.map(i => ({
                        id: i.id,
                        name: i.name,
                        qty: i.quantity,
                        category: i.category,
                        tags: i.detected_labels || [],
                        image_url: i.image_url
                    }))
                }))
            }));

            renderInventory();
        }
    } catch (err) {
        console.error("Fetch Error:", err);
        // On error, if empty, we might show a hint setup message in render
    }
}

async function onScanCapture(file) {
    if (!file) return;

    const scanBtn = document.getElementById('btn-scan');
    const originalText = scanBtn.querySelector('.fab-label').textContent;
    scanBtn.querySelector('.fab-label').textContent = "Analyzing...";

    try {
        console.log("Uploading file...", file.name);

        // Upload to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `scans/${Date.now()}.${fileExt}`;

        const { data, error } = await supabase.storage
            .from('inventory-images')
            .upload(fileName, file);

        if (error) throw new Error("Upload failed: " + error.message);

        // Get Public URL
        const { data: publicData } = supabase.storage
            .from('inventory-images')
            .getPublicUrl(fileName);

        const publicUrl = publicData.publicUrl;
        console.log("File uploaded:", publicUrl);

        // Mock AI for now
        const aiResult = await mockAIAnalysis(file);

        // Show Review Modal
        openReviewModal(publicUrl, aiResult);

    } catch (err) {
        console.error("Scan Error:", err);
        alert("Error during scan: " + err.message);
    } finally {
        scanBtn.querySelector('.fab-label').textContent = originalText;
    }
}

async function mockAIAnalysis(file) {
    const items = [
        { name: "AA Batteries", cat: "Tools" },
        { name: "Coffee Mug", cat: "Kitchen" },
        { name: "Wireless Mouse", cat: "Electronics" },
        { name: "Succulent Plant", cat: "Decor" }
    ];
    const random = items[Math.floor(Math.random() * items.length)];

    return {
        name: random.name,
        quantity: 1,
        category: random.cat,
        detected_labels: ['object', random.name.toLowerCase()]
    };
}

function openReviewModal(imgUrl, aiData) {
    reviewImg.src = imgUrl;
    reviewName.value = aiData.name;
    document.getElementById('review-qty').textContent = aiData.quantity;
    reviewCategory.value = aiData.category;

    currentReviewItem = {
        image_url: imgUrl,
        ...aiData
    };

    modalReview.classList.add('active');
}

function setupModal() {
    modalReview.querySelector('.close-modal').addEventListener('click', () => {
        modalReview.classList.remove('active');
    });

    document.getElementById('qty-minus').addEventListener('click', () => {
        let q = parseInt(reviewQty.textContent);
        if (q > 1) reviewQty.textContent = q - 1;
    });
    document.getElementById('qty-plus').addEventListener('click', () => {
        let q = parseInt(reviewQty.textContent);
        reviewQty.textContent = q + 1;
    });

    // Valid Save Logic
    document.getElementById('btn-save-item').addEventListener('click', async () => {
        const btn = document.getElementById('btn-save-item');
        const originalText = btn.textContent;
        btn.textContent = "Saving...";
        btn.disabled = true;

        try {
            // Pick default storage
            let storageId = null;
            const { data: storageData } = await supabase.from('storage_units').select('id').limit(1);
            if (storageData && storageData.length > 0) storageId = storageData[0].id;

            if (!storageId) throw new Error("No storage units found. Run the SQL setup first.");

            const newItem = {
                name: reviewName.value,
                quantity: parseInt(reviewQty.textContent),
                category: reviewCategory.value,
                image_url: currentReviewItem.image_url,
                storage_id: storageId,
                detected_labels: currentReviewItem.detected_labels || []
            };

            console.log("Saving to DB:", newItem);

            const { error } = await supabase.from('items').insert([newItem]);
            if (error) throw error;

            await fetchInventory(); // Refresh

            modalReview.classList.remove('active');
            switchView('view-inventory');

        } catch (err) {
            console.error("Save Error:", err);
            alert("Failed to save: " + err.message);
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });
}

function setupActions() {
    const scanBtn = document.getElementById('btn-scan');
    scanBtn.addEventListener('click', () => {
        cameraInput.click();
    });
    cameraInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            onScanCapture(e.target.files[0]);
        }
    });
}

// --- UI HELPERS ---

function setupNavigation() {
    navItems.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = btn.dataset.target;
            if (targetId) {
                switchView(targetId);
                navItems.forEach(n => n.classList.remove('active'));
                btn.classList.add('active');
            }
        });
    });
    document.getElementById('btn-back-details').addEventListener('click', () => {
        switchView('view-inventory');
    });
}

function switchView(viewId) {
    Object.values(views).forEach(el => el.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) {
        target.classList.add('active');
        state.currentView = viewId;

        if (viewId === 'view-dashboard') pageTitle.textContent = 'Dashboard';
        if (viewId === 'view-inventory') pageTitle.textContent = 'Inventory';
        if (viewId === 'view-details') pageTitle.textContent = 'Item Details';
    }
}

function renderInventory() {
    inventoryListEl.innerHTML = '';

    if (!inventoryData || inventoryData.length === 0) {
        inventoryListEl.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                <p>No inventory found or loading...</p>
                <small>Ensure you ran the SQL setup in Supabase.</small>
            </div>
        `;
        return;
    }

    inventoryData.forEach(room => {
        const roomEl = document.createElement('div');
        roomEl.className = 'room-group';

        let storageHtml = '';
        if (room.storage && room.storage.length > 0) {
            room.storage.forEach(unit => {
                let itemsHtml = '';
                if (unit.items && unit.items.length > 0) {
                    unit.items.forEach(item => {
                        itemsHtml += `
                            <div class="item-row" onclick="viewItemDetails(${item.id})">
                                <span>${item.name}</span>
                                <span class="item-badge">${item.qty}</span>
                            </div>
                        `;
                    });
                } else {
                    itemsHtml = '<div style="padding: 10px; font-size: 13px; color: #ccc;">No items</div>';
                }

                storageHtml += `
                    <div class="storage-unit">
                        <div class="storage-header">${unit.name}</div>
                        ${itemsHtml}
                    </div>
                `;
            });
        }

        roomEl.innerHTML = `
            <div class="room-header">${room.room}</div>
            ${storageHtml}
        `;

        inventoryListEl.appendChild(roomEl);
    });
}

window.viewItemDetails = function (id) {
    let foundItem = null;
    let foundRoom = "";
    let foundStorage = "";

    // Deep search
    inventoryData.forEach(r => {
        r.storage.forEach(s => {
            const item = s.items.find(i => i.id === id);
            if (item) {
                foundItem = item;
                foundRoom = r.room;
                foundStorage = s.name;
            }
        });
    });

    if (!foundItem) return;

    const container = document.getElementById('view-details');
    container.querySelector('.detail-name').textContent = foundItem.name;
    container.querySelector('.value').textContent = foundItem.qty;

    // Breadcrumb
    container.querySelector('.breadcrumb').innerHTML = `
        <span class="crumb">${foundRoom}</span>
        <span class="separator">/</span>
        <span class="crumb highlight">${foundStorage}</span>
    `;

    // Category
    const catRow = container.querySelectorAll('.detail-row')[2];
    if (catRow) catRow.querySelector('.value').textContent = foundItem.category || 'General';

    // Tags
    const tagsContainer = container.querySelector('.tags-row');
    tagsContainer.innerHTML = '';
    if (foundItem.tags) {
        foundItem.tags.forEach(tag => {
            const span = document.createElement('span');
            span.className = 'tag';
            span.textContent = tag;
            tagsContainer.appendChild(span);
        });
    }

    switchView('view-details');
};
