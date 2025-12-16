import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Alert, TextInput, Modal, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import RoomSection from '../components/RoomSection';

const InventoryScreen = ({ navigation }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Rename Modal State
    const [renameModalVisible, setRenameModalVisible] = useState(false);
    const [renameTarget, setRenameTarget] = useState(null); // { type: 'room'|'storage', id, currentName }
    const [newName, setNewName] = useState('');

    const fetchInventory = async () => {
        try {
            // Supabase Query
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
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchInventory();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchInventory();
    }, []);

    const handleItemPress = (item) => {
        // Navigate to Details? For now just log or alert
        // navigation.navigate('ItemDetails', { item });
        console.log("Pressed item", item.name);
    };

    // Delete Room
    const handleDeleteRoom = (room) => {
        Alert.alert(
            "Delete Room",
            `Are you sure you want to delete '${room.name}'? All storage units and items inside it will be lost.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('rooms')
                                .delete()
                                .eq('id', room.id);

                            if (error) throw error;

                            Alert.alert("Success", "Room deleted successfully!");
                            fetchInventory(); // Refresh list
                        } catch (err) {
                            Alert.alert("Error", "Failed to delete room: " + err.message);
                        }
                    }
                }
            ]
        );
    };

    // Delete Storage Unit
    const handleDeleteStorageUnit = (unit) => {
        Alert.alert(
            "Delete Storage Unit",
            `Are you sure you want to delete '${unit.name}'? All items inside it will be lost.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('storage_units')
                                .delete()
                                .eq('id', unit.id);

                            if (error) throw error;

                            Alert.alert("Success", "Storage unit deleted successfully!");
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
                <FlatList
                    data={data}
                    keyExtractor={item => item.id.toString()}
                    renderItem={({ item }) => (
                        <RoomSection
                            room={item}
                            storageUnits={item.storage}
                            onItemPress={handleItemPress}
                            onDeleteRoom={handleDeleteRoom}
                            onEditRoom={handleEditRoom}
                            onDeleteStorageUnit={handleDeleteStorageUnit}
                            onEditStorageUnit={handleEditStorageUnit}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C9B59C" />
                    }
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={styles.emptyText}>No inventory found.</Text>
                        </View>
                    }
                />
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
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#2D2D2D',
        marginBottom: 8,
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
