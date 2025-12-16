import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Alert, TextInput, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import RoomSection from '../components/RoomSection';
import ItemRow from '../components/ItemRow';

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
        console.log("Pressed item", item.name);
    };

    // Delete Room - with safety for items
    const handleDeleteRoom = (room) => {
        Alert.alert(
            "Delete Room",
            `Delete '${room.name}'? All items inside will be moved to 'Unsorted Items'.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // STEP 1: Set all items in this room's storage units to null
                            // First get all storage unit IDs in this room
                            const { data: storageUnits } = await supabase
                                .from('storage_units')
                                .select('id')
                                .eq('room_id', room.id);

                            if (storageUnits && storageUnits.length > 0) {
                                const storageIds = storageUnits.map(u => u.id);

                                // Update items to have null storage_id
                                await supabase
                                    .from('items')
                                    .update({ storage_id: null })
                                    .in('storage_id', storageIds);
                            }

                            // STEP 2: Delete the room (cascade will delete storage units)
                            const { error } = await supabase
                                .from('rooms')
                                .delete()
                                .eq('id', room.id);

                            if (error) throw error;

                            Alert.alert("Success", "Room deleted. Items moved to 'Unsorted'.");
                            fetchInventory(); // Refresh list
                        } catch (err) {
                            Alert.alert("Error", "Failed to delete room: " + err.message);
                        }
                    }
                }
            ]
        );
    };

    // Delete Storage Unit - with safety for items
    const handleDeleteStorageUnit = (unit) => {
        Alert.alert(
            "Delete Storage Unit",
            `Delete '${unit.name}'? All items inside will be moved to 'Unsorted Items'.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // STEP 1: Set all items in this storage unit to null
                            await supabase
                                .from('items')
                                .update({ storage_id: null })
                                .eq('storage_id', unit.id);

                            // STEP 2: Delete the storage unit
                            const { error } = await supabase
                                .from('storage_units')
                                .delete()
                                .eq('id', unit.id);

                            if (error) throw error;

                            Alert.alert("Success", "Storage unit deleted. Items moved to 'Unsorted'.");
                            fetchInventory(); // Refresh list
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

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.title}>Inventory</Text>
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
                                    <ItemRow item={item} onPress={() => handleItemPress(item)} />
                                    <TouchableOpacity
                                        style={styles.moveBtn}
                                        onPress={() => handleMoveItem(item)}
                                    >
                                        <MaterialIcons name="drive-file-move" size={20} color="white" />
                                        <Text style={styles.moveBtnTxt}>Move</Text>
                                    </TouchableOpacity>
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
                            Moving: {itemToMove?.name}
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
                                onPress={handleMoveSubmit}
                            >
                                <Text style={styles.submitBtnTxt}>Move Here</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
});

export default InventoryScreen;
