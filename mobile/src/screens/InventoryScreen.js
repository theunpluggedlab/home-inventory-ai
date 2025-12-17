import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Alert, TextInput, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase, uploadImage } from '../lib/supabase';
import RoomSection from '../components/RoomSection';
import ItemRow from '../components/ItemRow';
import ItemDetailModal from '../components/ItemDetailModal';
import BulkEditModal from '../components/BulkEditModal';

const InventoryScreen = ({ navigation }) => {
    const [data, setData] = useState([]);
    const [unsortedItems, setUnsortedItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Rename Modal State
    const [renameModalVisible, setRenameModalVisible] = useState(false);
    const [renameTarget, setRenameTarget] = useState(null); // { type: 'room'|'storage', id, currentName }
    const [newName, setNewName] = useState('');

    // Move Item Modal State
    const [moveModalVisible, setMoveModalVisible] = useState(false);
    const [itemToMove, setItemToMove] = useState(null);
    const [locations, setLocations] = useState([]);
    const [selectedLocation, setSelectedLocation] = useState(null);

    // Item Detail Modal State
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    // Selection Mode State
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedRooms, setSelectedRooms] = useState([]);
    const [selectedStorageUnits, setSelectedStorageUnits] = useState([]);
    const [selectedItems, setSelectedItems] = useState([]);

    // Bulk Edit Modal State
    const [bulkEditModalVisible, setBulkEditModalVisible] = useState(false);

    const fetchInventory = async () => {
        try {
            // Fetch regular inventory (rooms with storage units)
            const { data: rawData, error } = await supabase
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
                    image_url
                )
            )
        `);

            if (error) throw error;

            console.log('Fetched inventory items:', rawData?.length);
            setData(rawData || []);

            // Fetch unsorted items (where storage_id is null)
            const { data: unsorted, error: unsortedError } = await supabase
                .from('items')
                .select('*')
                .is('storage_id', null);

            if (unsortedError) throw unsortedError;

            console.log('Fetched unsorted items:', unsorted?.length);
            setUnsortedItems(unsorted || []);

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchLocations = async () => {
        try {
            const { data, error } = await supabase
                .from('storage_units')
                .select('id, name, rooms(name)')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formatted = data.map(unit => ({
                id: unit.id,
                name: unit.name,
                room: unit.rooms?.name || "Unknown Room",
                label: `${unit.rooms?.name || 'Unknown'} > ${unit.name}`
            }));
            setLocations(formatted);
        } catch (err) {
            console.log("Error fetching locations:", err);
        }
    };

    useEffect(() => {
        fetchInventory();
        fetchLocations();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchInventory();
        fetchLocations();
    }, []);

    const handleItemPress = (item) => {
        if (!isSelectionMode) {
            console.log("Pressed item", item.name);
            setSelectedItem(item);
            setDetailModalVisible(true);
        }
    };

    // ===== SELECTION MODE HANDLERS =====
    const enterSelectionMode = (type, entity) => {
        setIsSelectionMode(true);
        if (type === 'room') {
            setSelectedRooms([entity.id]);
        } else if (type === 'storage') {
            setSelectedStorageUnits([entity.id]);
        } else if (type === 'item') {
            setSelectedItems([entity.id]);
        }
    };

    const exitSelectionMode = () => {
        setIsSelectionMode(false);
        setSelectedRooms([]);
        setSelectedStorageUnits([]);
        setSelectedItems([]);
    };

    const handleLongPressRoom = (room) => {
        enterSelectionMode('room', room);
    };

    const handleLongPressStorage = (unit) => {
        enterSelectionMode('storage', unit);
    };

    const handleLongPressItem = (item) => {
        enterSelectionMode('item', item);
    };

    const handleToggleSelectRoom = (roomId) => {
        setSelectedRooms(prev =>
            prev.includes(roomId)
                ? prev.filter(id => id !== roomId)
                : [...prev, roomId]
        );
    };

    const handleToggleSelectStorage = (storageId) => {
        setSelectedStorageUnits(prev =>
            prev.includes(storageId)
                ? prev.filter(id => id !== storageId)
                : [...prev, storageId]
        );
    };

    const handleToggleSelectItem = (item) => {
        setSelectedItems(prev =>
            prev.includes(item.id)
                ? prev.filter(id => id !== item.id)
                : [...prev, item.id]
        );
    };

    const handleSelectAll = () => {
        // Determine what to select all based on current selection context
        if (selectedItems.length > 0 || (selectedRooms.length === 0 && selectedStorageUnits.length === 0)) {
            // Select all items
            const allItemIds = [];
            data.forEach(room => {
                room.storage?.forEach(unit => {
                    unit.items?.forEach(item => {
                        allItemIds.push(item.id);
                    });
                });
            });
            unsortedItems.forEach(item => allItemIds.push(item.id));
            setSelectedItems(allItemIds);
        } else if (selectedRooms.length > 0) {
            // Select all rooms
            const allRoomIds = data.map(room => room.id);
            setSelectedRooms(allRoomIds);
        } else if (selectedStorageUnits.length > 0) {
            // Select all storage units
            const allStorageIds = [];
            data.forEach(room => {
                room.storage?.forEach(unit => {
                    allStorageIds.push(unit.id);
                });
            });
            setSelectedStorageUnits(allStorageIds);
        }
    };

    // Delete Room - STRICT: Cannot delete if items exist
    const handleDeleteRoom = (room) => {
        Alert.alert(
            "Delete Room",
            `Delete '${room.name}'?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // Check if room contains any items (via storage units)
                            const { data: storageUnits } = await supabase
                                .from('storage_units')
                                .select('id, items(id)') // Select items to count
                                .eq('room_id', room.id);

                            // Check total item count
                            let totalItems = 0;
                            if (storageUnits) {
                                storageUnits.forEach(unit => {
                                    if (unit.items) totalItems += unit.items.length;
                                });
                            }

                            if (totalItems > 0) {
                                Alert.alert("Cannot Delete", `This room contains ${totalItems} item(s). Please remove or move them first.`);
                                return;
                            }

                            // Safe to delete (Cascade handles empty storage units)
                            const { error } = await supabase
                                .from('rooms')
                                .delete()
                                .eq('id', room.id);

                            if (error) throw error;

                            Alert.alert("Success", "Room deleted.");
                            fetchInventory();
                        } catch (err) {
                            Alert.alert("Error", "Failed to delete room: " + err.message);
                        }
                    }
                }
            ]
        );
    };

    // Delete Storage Unit - STRICT: Cannot delete if items exist
    const handleDeleteStorageUnit = (unit) => {
        Alert.alert(
            "Delete Storage Unit",
            `Delete '${unit.name}'?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // Check for items
                            const { count, error: countError } = await supabase
                                .from('items')
                                .select('*', { count: 'exact', head: true })
                                .eq('storage_id', unit.id);

                            if (countError) throw countError;

                            if (count > 0) {
                                Alert.alert("Cannot Delete", `This storage unit contains ${count} item(s). Please remove or move them first.`);
                                return;
                            }

                            // Safe to delete
                            const { error } = await supabase
                                .from('storage_units')
                                .delete()
                                .eq('id', unit.id);

                            if (error) throw error;

                            Alert.alert("Success", "Storage unit deleted.");
                            fetchInventory();
                        } catch (err) {
                            Alert.alert("Error", "Failed to delete storage unit: " + err.message);
                        }
                    }
                }
            ]
        );
    };

    // Open Rename Modal
    const handleEditRoom = (room) => {
        setRenameTarget({ type: 'room', id: room.id, currentName: room.name });
        setNewName(room.name);
        setRenameModalVisible(true);
    };

    const handleEditStorageUnit = (unit) => {
        setRenameTarget({ type: 'storage', id: unit.id, currentName: unit.name });
        setNewName(unit.name);
        setRenameModalVisible(true);
    };

    // Submit Rename
    const handleRenameSubmit = async () => {
        if (!newName.trim()) {
            Alert.alert("Error", "Name cannot be empty");
            return;
        }

        try {
            const tableName = renameTarget.type === 'room' ? 'rooms' : 'storage_units';
            const { error } = await supabase
                .from(tableName)
                .update({ name: newName.trim() })
                .eq('id', renameTarget.id);

            if (error) throw error;

            Alert.alert("Success", `${renameTarget.type === 'room' ? 'Room' : 'Storage unit'} renamed successfully!`);
            setRenameModalVisible(false);
            fetchInventory(); // Refresh list
        } catch (err) {
            Alert.alert("Error", "Failed to rename: " + err.message);
        }
    };

    // Move Item functionality
    const handleMoveItem = (item) => {
        setItemToMove(item);
        setSelectedLocation(null);
        setMoveModalVisible(true);
    };

    const handleMoveSubmit = async () => {
        if (!selectedLocation) {
            Alert.alert("Error", "Please select a location");
            return;
        }

        try {
            const { error } = await supabase
                .from('items')
                .update({ storage_id: selectedLocation.id })
                .eq('id', itemToMove.id);

            if (error) throw error;

            Alert.alert("Success", `Item moved to ${selectedLocation.label}`);
            setMoveModalVisible(false);
            fetchInventory(); // Refresh list
        } catch (err) {
            Alert.alert("Error", "Failed to move item: " + err.message);
        }
    };

    // ===== BULK OPERATIONS =====
    const handleBulkDelete = async () => {
        const totalSelected = selectedRooms.length + selectedStorageUnits.length + selectedItems.length;

        Alert.alert(
            "Confirm Bulk Delete",
            `Are you sure you want to delete the selected items?\n\nRooms: ${selectedRooms.length}\nStorage Units: ${selectedStorageUnits.length}\nItems: ${selectedItems.length}`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            let deletedRooms = 0;
                            let skippedRooms = 0;
                            let deletedStorage = 0;
                            let skippedStorage = 0;

                            // BULK DELETE ROOMS - with safety check
                            if (selectedRooms.length > 0) {
                                for (const roomId of selectedRooms) {
                                    // Check if room has items
                                    const { data: storageUnits } = await supabase
                                        .from('storage_units')
                                        .select('id')
                                        .eq('room_id', roomId);

                                    if (storageUnits && storageUnits.length > 0) {
                                        const storageIds = storageUnits.map(u => u.id);
                                        const { data: items } = await supabase
                                            .from('items')
                                            .select('id')
                                            .in('storage_id', storageIds);

                                        if (items && items.length > 0) {
                                            skippedRooms++;
                                            continue; // Skip this room
                                        }
                                    }

                                    // Room is empty, safe to delete
                                    const { error } = await supabase
                                        .from('rooms')
                                        .delete()
                                        .eq('id', roomId);

                                    if (!error) deletedRooms++;
                                }
                            }

                            // BULK DELETE STORAGE UNITS - with safety check
                            if (selectedStorageUnits.length > 0) {
                                for (const storageId of selectedStorageUnits) {
                                    // Check if storage has items
                                    const { data: items } = await supabase
                                        .from('items')
                                        .select('id')
                                        .eq('storage_id', storageId);

                                    if (items && items.length > 0) {
                                        skippedStorage++;
                                        continue; // Skip this storage
                                    }

                                    // Storage is empty, safe to delete
                                    const { error } = await supabase
                                        .from('storage_units')
                                        .delete()
                                        .eq('id', storageId);

                                    if (!error) deletedStorage++;
                                }
                            }

                            // BULK DELETE ITEMS
                            if (selectedItems.length > 0) {
                                const { error } = await supabase
                                    .from('items')
                                    .delete()
                                    .in('id', selectedItems);

                                if (error) throw error;
                            }

                            // Build result message
                            let message = [];
                            if (selectedItems.length > 0) {
                                message.push(`Deleted ${selectedItems.length} item${selectedItems.length !== 1 ? 's' : ''}.`);
                            }
                            if (deletedRooms > 0 || skippedRooms > 0) {
                                message.push(`Deleted ${deletedRooms} empty room${deletedRooms !== 1 ? 's' : ''}.`);
                                if (skippedRooms > 0) {
                                    message.push(`${skippedRooms} room${skippedRooms !== 1 ? 's' : ''} skipped (contains items).`);
                                }
                            }
                            if (deletedStorage > 0 || skippedStorage > 0) {
                                message.push(`Deleted ${deletedStorage} empty storage unit${deletedStorage !== 1 ? 's' : ''}.`);
                                if (skippedStorage > 0) {
                                    message.push(`${skippedStorage} storage unit${skippedStorage !== 1 ? 's' : ''} skipped (contains items).`);
                                }
                            }

                            Alert.alert("Bulk Delete Complete", message.join('\n'));
                            exitSelectionMode();
                            fetchInventory();
                        } catch (err) {
                            Alert.alert("Error", "Failed to delete: " + err.message);
                        }
                    }
                }
            ]
        );
    };

    const handleBulkMove = () => {
        if (selectedItems.length === 0) {
            Alert.alert("No Items Selected", "Please select items to move");
            return;
        }

        setSelectedLocation(null);
        setMoveModalVisible(true);
    };

    const handleBulkMoveSubmit = async () => {
        if (!selectedLocation) {
            Alert.alert("Error", "Please select a location");
            return;
        }

        try {
            const { error } = await supabase
                .from('items')
                .update({ storage_id: selectedLocation.id })
                .in('id', selectedItems);

            if (error) throw error;

            Alert.alert("Success", `${selectedItems.length} item${selectedItems.length !== 1 ? 's' : ''} moved to ${selectedLocation.label}`);
            setMoveModalVisible(false);
            exitSelectionMode();
            fetchInventory();
        } catch (err) {
            Alert.alert("Error", "Failed to move items: " + err.message);
        }
    };

    const handleBulkEdit = () => {
        if (selectedItems.length === 0) {
            Alert.alert("No Items Selected", "Please select items to edit");
            return;
        }
        setBulkEditModalVisible(true);
    };

    const handleBulkEditSubmit = async (updates) => {
        try {
            const updateData = {};
            if (updates.name) updateData.name = updates.name;

            if (updates.photo) {
                // Upload photo first
                const publicUrl = await uploadImage(updates.photo);
                updateData.image_url = publicUrl;
            }

            const { error } = await supabase
                .from('items')
                .update(updateData)
                .in('id', selectedItems);

            if (error) throw error;

            Alert.alert("Success", `${selectedItems.length} item${selectedItems.length !== 1 ? 's' : ''} updated successfully!`);
            exitSelectionMode();
            fetchInventory();
        } catch (err) {
            Alert.alert("Error", "Failed to update items: " + err.message);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                {isSelectionMode ? (
                    <View style={styles.selectionHeader}>
                        <TouchableOpacity onPress={exitSelectionMode}>
                            <MaterialIcons name="close" size={24} color="#2D2D2D" />
                        </TouchableOpacity>
                        <Text style={styles.selectionTitle}>
                            {selectedRooms.length + selectedStorageUnits.length + selectedItems.length} Selected
                        </Text>
                        <TouchableOpacity onPress={handleSelectAll}>
                            <Text style={styles.selectAllBtn}>Select All</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <Text style={styles.title}>Inventory</Text>
                )}
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#C9B59C" />
                </View>
            ) : (
                <ScrollView
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C9B59C" />
                    }
                    contentContainerStyle={styles.listContent}
                >
                    {/* Unsorted Items Section */}
                    {unsortedItems.length > 0 && (
                        <View style={styles.unsortedSection}>
                            <View style={styles.unsortedHeader}>
                                <MaterialIcons name="warning" size={20} color="#FF6B6B" />
                                <Text style={styles.unsortedTitle}>Unsorted Items ({unsortedItems.length})</Text>
                            </View>
                            <Text style={styles.unsortedSubtitle}>
                                These items need to be assigned to a location
                            </Text>
                            {unsortedItems.map(item => (
                                <View key={item.id} style={styles.unsortedItemRow}>
                                    <ItemRow
                                        item={item}
                                        onPress={() => handleItemPress(item)}
                                        isSelectionMode={isSelectionMode}
                                        isSelected={selectedItems.includes(item.id)}
                                        onLongPress={handleLongPressItem}
                                        onToggleSelect={handleToggleSelectItem}
                                    />
                                    {!isSelectionMode && (
                                        <TouchableOpacity
                                            style={styles.moveBtn}
                                            onPress={() => handleMoveItem(item)}
                                        >
                                            <MaterialIcons name="drive-file-move" size={20} color="white" />
                                            <Text style={styles.moveBtnTxt}>Move</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Regular Inventory */}
                    {data.length === 0 ? (
                        <View style={styles.center}>
                            <Text style={styles.emptyText}>No inventory found.</Text>
                        </View>
                    ) : (
                        data.map(room => (
                            <RoomSection
                                key={room.id}
                                room={room}
                                storageUnits={room.storage}
                                onItemPress={handleItemPress}
                                onDeleteRoom={handleDeleteRoom}
                                onEditRoom={handleEditRoom}
                                onDeleteStorageUnit={handleDeleteStorageUnit}
                                onEditStorageUnit={handleEditStorageUnit}
                                isSelectionMode={isSelectionMode}
                                selectedRooms={selectedRooms}
                                selectedStorageUnits={selectedStorageUnits}
                                selectedItems={selectedItems}
                                onLongPressRoom={handleLongPressRoom}
                                onLongPressStorage={handleLongPressStorage}
                                onLongPressItem={handleLongPressItem}
                                onToggleSelectRoom={handleToggleSelectRoom}
                                onToggleSelectStorage={handleToggleSelectStorage}
                                onToggleSelectItem={handleToggleSelectItem}
                            />
                        ))
                    )}
                </ScrollView>
            )}

            {/* Rename Modal */}
            <Modal visible={renameModalVisible} animationType="fade" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            Rename {renameTarget?.type === 'room' ? 'Room' : 'Storage Unit'}
                        </Text>
                        <Text style={styles.modalSubtitle}>Current: {renameTarget?.currentName}</Text>

                        <TextInput
                            style={styles.modalInput}
                            value={newName}
                            onChangeText={setNewName}
                            placeholder="Enter new name"
                            autoFocus={true}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => setRenameModalVisible(false)}
                            >
                                <Text style={styles.cancelBtnTxt}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.submitBtn}
                                onPress={handleRenameSubmit}
                            >
                                <Text style={styles.submitBtnTxt}>Rename</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Move Item Modal */}
            <Modal visible={moveModalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Move Item</Text>
                            <TouchableOpacity onPress={() => setMoveModalVisible(false)}>
                                <MaterialIcons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalSubtitle}>
                            {isSelectionMode && selectedItems.length > 0
                                ? `Moving ${selectedItems.length} item${selectedItems.length !== 1 ? 's' : ''}`
                                : `Moving: ${itemToMove?.name}`}
                        </Text>

                        <Text style={styles.sectionLabel}>Select Location:</Text>

                        <ScrollView style={styles.locationList}>
                            {locations.map(loc => (
                                <TouchableOpacity
                                    key={loc.id}
                                    style={[
                                        styles.locationItem,
                                        selectedLocation?.id === loc.id && styles.locationItemSelected
                                    ]}
                                    onPress={() => setSelectedLocation(loc)}
                                >
                                    <View>
                                        <Text style={styles.locationName}>{loc.name}</Text>
                                        <Text style={styles.locationRoom}>{loc.room}</Text>
                                    </View>
                                    {selectedLocation?.id === loc.id && (
                                        <MaterialIcons name="check-circle" size={24} color="#C9B59C" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => setMoveModalVisible(false)}
                            >
                                <Text style={styles.cancelBtnTxt}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.submitBtn}
                                onPress={isSelectionMode && selectedItems.length > 0 ? handleBulkMoveSubmit : handleMoveSubmit}
                            >
                                <Text style={styles.submitBtnTxt}>
                                    {isSelectionMode && selectedItems.length > 0
                                        ? `Move ${selectedItems.length} Item${selectedItems.length !== 1 ? 's' : ''}`
                                        : 'Move Here'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Item Detail Modal */}
            <ItemDetailModal
                visible={detailModalVisible}
                item={selectedItem}
                onClose={() => setDetailModalVisible(false)}
                onUpdate={() => {
                    fetchInventory();
                    fetchLocations();
                }}
            />

            {/* Bulk Edit Modal */}
            <BulkEditModal
                visible={bulkEditModalVisible}
                selectedCount={selectedItems.length}
                onClose={() => setBulkEditModalVisible(false)}
                onSubmit={handleBulkEditSubmit}
            />

            {/* Bulk Action Bar */}
            {isSelectionMode && (
                <View style={styles.bulkActionBar}>
                    <TouchableOpacity
                        style={styles.actionBarBtn}
                        onPress={exitSelectionMode}
                    >
                        <MaterialIcons name="close" size={20} color="#666" />
                        <Text style={styles.actionBarBtnText}>Cancel</Text>
                    </TouchableOpacity>

                    {selectedItems.length > 0 && (
                        <>
                            <TouchableOpacity
                                style={[styles.actionBarBtn, styles.actionBarBtnPrimary]}
                                onPress={handleBulkMove}
                            >
                                <MaterialIcons name="drive-file-move" size={20} color="white" />
                                <Text style={styles.actionBarBtnTextWhite}>Move</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionBarBtn, styles.actionBarBtnPrimary]}
                                onPress={handleBulkEdit}
                            >
                                <MaterialIcons name="edit" size={20} color="white" />
                                <Text style={styles.actionBarBtnTextWhite}>Edit</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    <TouchableOpacity
                        style={[styles.actionBarBtn, styles.actionBarBtnDanger]}
                        onPress={handleBulkDelete}
                    >
                        <MaterialIcons name="delete" size={20} color="white" />
                        <Text style={styles.actionBarBtnTextWhite}>Delete</Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9F8F6',
    },
    header: {
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#EFE9E3',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#2D2D2D',
    },
    listContent: {
        padding: 24,
        paddingBottom: 100,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        color: '#999',
        fontSize: 16,
    },
    // Unsorted Items Section
    unsortedSection: {
        backgroundColor: '#FFF5F5',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        borderWidth: 2,
        borderColor: '#FFE0E0',
    },
    unsortedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    unsortedTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FF6B6B',
        marginLeft: 8,
    },
    unsortedSubtitle: {
        fontSize: 13,
        color: '#999',
        marginBottom: 16,
    },
    unsortedItemRow: {
        marginBottom: 8,
    },
    moveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#C9B59C',
        padding: 12,
        borderRadius: 8,
        marginTop: 8,
        gap: 6,
    },
    moveBtnTxt: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#2D2D2D',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#999',
        marginBottom: 16,
    },
    modalInput: {
        borderWidth: 1,
        borderColor: '#EFE9E3',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        backgroundColor: '#FAFAFA',
        marginBottom: 24,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2D2D2D',
        marginBottom: 12,
    },
    locationList: {
        maxHeight: 300,
        marginBottom: 24,
    },
    locationItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#F9F9F9',
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    locationItemSelected: {
        borderColor: '#C9B59C',
        backgroundColor: '#FCF8F4',
    },
    locationName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2D2D2D',
    },
    locationRoom: {
        fontSize: 13,
        color: '#999',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelBtn: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EFE9E3',
        alignItems: 'center',
    },
    cancelBtnTxt: {
        color: '#666',
        fontWeight: '600',
    },
    submitBtn: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#C9B59C',
        alignItems: 'center',
    },
    submitBtnTxt: {
        color: 'white',
        fontWeight: '600',
    },
    // Selection Mode Styles
    selectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    selectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#2D2D2D',
        flex: 1,
        textAlign: 'center',
    },
    selectAllBtn: {
        fontSize: 14,
        fontWeight: '600',
        color: '#C9B59C',
    },
    // Bulk Action Bar
    bulkActionBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        flexDirection: 'row',
        padding: 16,
        paddingBottom: 32,
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: '#EFE9E3',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
    },
    actionBarBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#F5F5F5',
        flex: 1,
    },
    actionBarBtnPrimary: {
        backgroundColor: '#C9B59C',
    },
    actionBarBtnDanger: {
        backgroundColor: '#FF6B6B',
    },
    actionBarBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    actionBarBtnTextWhite: {
        fontSize: 14,
        fontWeight: '600',
        color: 'white',
    },
});

export default InventoryScreen;
