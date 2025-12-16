
import React, { useState, useEffect } from 'react';
import { View, Text, Image, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, FlatList, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { analyzeImageWithGemini } from '../lib/gemini';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

const ReviewScreen = ({ route, navigation }) => {
    const { imageUri } = route.params;

    // State for List of Items
    const [items, setItems] = useState([]);
    const [analyzing, setAnalyzing] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    // Location State
    const [locationModalVisible, setLocationModalVisible] = useState(false);
    const [locations, setLocations] = useState([]);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [isCreatingLocation, setIsCreatingLocation] = useState(false);
    const [newRoomName, setNewRoomName] = useState("");
    const [newUnitName, setNewUnitName] = useState("");

    useEffect(() => {
        runAnalysis();
        fetchLocations();
    }, []);

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
                label: `${unit.rooms?.name || 'Create Room'} > ${unit.name}`
            }));
            setLocations(formatted);

            // Auto-select if only one exists
            if (formatted.length > 0) {
                setSelectedLocation(formatted[0]);
            }
        } catch (err) {
            console.log("Error fetching locations:", err);
        }
    };

    const runAnalysis = async () => {
        try {
            setAnalyzing(true);
            const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' });

            // Call Gemini
            const detectedItems = await analyzeImageWithGemini(base64);

            if (detectedItems && detectedItems.length > 0) {
                setItems(detectedItems);
            } else {
                setItems([{ name: 'Unknown Item', category: 'General', quantity: 1 }]);
            }

        } catch (error) {
            console.log("Analysis error:", error);
            setErrorMessage(error.message || "Unknown Error");
            setItems([{ name: 'Error scanning item', category: 'General', quantity: 1 }]);
        } finally {
            setAnalyzing(false);
        }
    };

    const createLocation = async () => {
        if (!newRoomName || !newUnitName) {
            Alert.alert("Required", "Please enter both Room and Unit/Container name.");
            return;
        }

        try {
            // 1. Create or Find Room
            // For simplicity, we just create a new room. In a real app we might search first.
            const { data: roomData, error: roomError } = await supabase
                .from('rooms')
                .insert({ name: newRoomName, user_id: 'offline_user_123' })
                .select()
                .single();

            if (roomError) throw roomError;

            // 2. Create Storage Unit
            const { data: unitData, error: unitError } = await supabase
                .from('storage_units')
                .insert({ name: newUnitName, room_id: roomData.id, user_id: 'offline_user_123' })
                .select()
                .single();

            if (unitError) throw unitError;

            // 3. Refresh and Select
            await fetchLocations();
            const newLoc = {
                id: unitData.id,
                name: unitData.name,
                room: roomData.name,
                label: `${roomData.name} > ${unitData.name}`
            };
            setSelectedLocation(newLoc);
            setIsCreatingLocation(false);
            setNewRoomName("");
            setNewUnitName("");

            // Auto-close modal if we came from there
            // setLocationModalVisible(false); // Optional: keep open to confirm? No, better feedback.

        } catch (err) {
            Alert.alert("Error", "Failed to create location: " + err.message);
        }
    };

    const updateItem = (index, field, value) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const removeItem = (index) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { name: '', category: 'General', quantity: 1 }]);
    };

    const onSaveAll = async () => {
        if (items.length === 0) return;

        // Validation: Location
        if (!selectedLocation) {
            setLocationModalVisible(true);
            return;
        }

        setSaving(true);
        try {
            // 1. Upload Image (Once for the batch)
            const fileName = `scans/${Date.now()}.jpg`;
            const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' });

            const { error: uploadError } = await supabase.storage
                .from('inventory-images')
                .upload(fileName, decode(base64), { contentType: 'image/jpeg' });

            let publicUrl = null;
            if (!uploadError) {
                const { data } = supabase.storage.from('inventory-images').getPublicUrl(fileName);
                publicUrl = data.publicUrl;
            }

            // 2. Prepare Bulk Insert using SELECTED location
            const records = items.map(item => ({
                name: item.name,
                quantity: Number(item.quantity) || 1,
                category: item.category,
                image_url: publicUrl,
                storage_id: selectedLocation.id,
                detected_labels: ["ai-import"],
                user_id: 'offline_user_123'
            }));

            const { error: dbError } = await supabase.from('items').insert(records);

            if (dbError) throw dbError;

            Alert.alert("Success", `Saved ${items.length} items to ${selectedLocation.name}!`);
            navigation.navigate('Main', { screen: 'Home' });

        } catch (err) {
            console.error(err);
            Alert.alert("Error", "Failed to save items.");
        } finally {
            setSaving(false);
        }
    };

    const renderItemRow = ({ item, index }) => (
        <View style={styles.itemRow}>
            {/* Remove Button */}
            <TouchableOpacity onPress={() => removeItem(index)} style={styles.removeBtn}>
                <Ionicons name="close-circle" size={24} color="#FF6B6B" />
            </TouchableOpacity>

            <View style={styles.rowInputs}>
                <Text style={styles.rowLabel}>Item Name</Text>
                <TextInput
                    style={styles.input}
                    value={item.name}
                    onChangeText={(txt) => updateItem(index, 'name', txt)}
                    placeholder="E.g. Advil"
                />

                <View style={styles.rowMeta}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.rowLabel}>Category</Text>
                        <TextInput
                            style={styles.input}
                            value={item.category}
                            onChangeText={(txt) => updateItem(index, 'category', txt)}
                        />
                    </View>
                    <View style={{ width: 80 }}>
                        <Text style={styles.rowLabel}>Qty</Text>
                        <TextInput
                            style={[styles.input, { textAlign: 'center' }]}
                            value={String(item.quantity)}
                            keyboardType="numeric"
                            onChangeText={(txt) => updateItem(index, 'quantity', txt)}
                        />
                    </View>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>

                {/* Header Image */}
                <View style={styles.imageContainer}>
                    <Image source={{ uri: imageUri }} style={styles.preview} />
                    {analyzing && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="large" color="#C9B59C" />
                            <Text style={styles.loadingText}>Gemini AI is scanning...</Text>
                        </View>
                    )}
                    {!!errorMessage && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorTitle}>Analysis Failed:</Text>
                            <Text style={styles.errorText}>{errorMessage}</Text>
                        </View>
                    )}
                </View>

                {/* Location Selection Bar */}
                <TouchableOpacity style={styles.locBar} onPress={() => setLocationModalVisible(true)}>
                    <View>
                        <Text style={styles.locLabel}>Saving to Location:</Text>
                        <Text style={styles.locValue}>
                            {selectedLocation ? selectedLocation.label : "Tap to Select..."}
                        </Text>
                    </View>
                    <MaterialIcons name="arrow-drop-down" size={24} color="#2D2D2D" />
                </TouchableOpacity>

                {/* Items List */}
                <View style={styles.listContainer}>
                    <View style={styles.listHeader}>
                        <Text style={styles.listTitle}>Detected Items ({items.length})</Text>
                        <TouchableOpacity onPress={addItem}>
                            <Text style={styles.addTxt}>+ Add Manually</Text>
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={items}
                        renderItem={renderItemRow}
                        keyExtractor={(_, i) => i.toString()}
                        contentContainerStyle={styles.listContent}
                    />
                </View>

                {/* Footer Buttons */}
                <View style={styles.footer}>
                    <TouchableOpacity style={[styles.btn, (saving || analyzing) && styles.disabled]} onPress={onSaveAll} disabled={saving || analyzing}>
                        <Text style={styles.btnTxt}>{saving ? "Saving..." : "Save to Inventory"}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
                        <Text style={styles.cancelTxt}>Cancel</Text>
                    </TouchableOpacity>
                </View>

                {/* Location Picker Modal */}
                <Modal visible={locationModalVisible} animationType="slide" transparent={true}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>
                                    {isCreatingLocation ? "Create New Location" : "Select Location"}
                                </Text>
                                <TouchableOpacity onPress={() => setLocationModalVisible(false)}>
                                    <Ionicons name="close" size={24} color="#333" />
                                </TouchableOpacity>
                            </View>

                            {isCreatingLocation ? (
                                <View style={styles.createForm}>
                                    <Text style={styles.inputLabel}>Room Name</Text>
                                    <TextInput
                                        style={styles.modalInput}
                                        placeholder="e.g. Office, Garage"
                                        autoFocus={true}
                                        value={newRoomName}
                                        onChangeText={setNewRoomName}
                                    />

                                    <Text style={styles.inputLabel}>Container / Unit</Text>
                                    <TextInput
                                        style={styles.modalInput}
                                        placeholder="e.g. Shelf A, Blue Box"
                                        value={newUnitName}
                                        onChangeText={setNewUnitName}
                                    />

                                    <View style={styles.modalActions}>
                                        <TouchableOpacity style={styles.outlineBtn} onPress={() => setIsCreatingLocation(false)}>
                                            <Text style={styles.outlineBtnTxt}>Back</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.primaryBtn} onPress={createLocation}>
                                            <Text style={styles.primaryBtnTxt}>Create & Select</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <>
                                    {locations.length === 0 ? (
                                        <View style={styles.emptyState}>
                                            <Text style={styles.emptyTxt}>No locations found.</Text>
                                            <Text style={styles.emptySub}>Create your first room to get started!</Text>
                                        </View>
                                    ) : (
                                        <FlatList
                                            data={locations}
                                            keyExtractor={item => item.id}
                                            style={{ maxHeight: 300 }}
                                            renderItem={({ item }) => (
                                                <TouchableOpacity
                                                    style={[styles.locItem, selectedLocation?.id === item.id && styles.locItemSelected]}
                                                    onPress={() => {
                                                        setSelectedLocation(item);
                                                        setLocationModalVisible(false);
                                                    }}
                                                >
                                                    <View>
                                                        <Text style={styles.locName}>{item.name}</Text>
                                                        <Text style={styles.locRoom}>{item.room}</Text>
                                                    </View>
                                                    {selectedLocation?.id === item.id && (
                                                        <Ionicons name="checkmark-circle" size={24} color="#C9B59C" />
                                                    )}
                                                </TouchableOpacity>
                                            )}
                                        />
                                    )}

                                    <TouchableOpacity style={styles.createBtn} onPress={() => setIsCreatingLocation(true)}>
                                        <Ionicons name="add-circle" size={24} color="white" style={{ marginRight: 8 }} />
                                        <Text style={styles.createBtnTxt}>Create New Location</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>
                </Modal>

            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9F8F6' },
    imageContainer: {
        height: 200,
        backgroundColor: '#000',
    },
    preview: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain'
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: { color: 'white', marginTop: 12, fontWeight: '600' },
    errorContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255, 0, 0, 0.8)',
        padding: 12,
        alignItems: 'center',
    },
    errorTitle: { color: 'white', fontWeight: 'bold', fontSize: 12, marginBottom: 2 },
    errorText: { color: 'white', fontSize: 11, textAlign: 'center' },

    // Location Bar
    locBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    locLabel: { fontSize: 11, color: '#999', marginBottom: 2 },
    locValue: { fontSize: 16, fontWeight: '600', color: '#2D2D2D' },

    listContainer: {
        flex: 1,
        backgroundColor: '#F9F8F6',
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        paddingBottom: 8,
    },
    listTitle: { fontSize: 18, fontWeight: '700', color: '#2D2D2D' },
    addTxt: { color: '#C9B59C', fontWeight: '600' },

    listContent: { padding: 16 },
    itemRow: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    removeBtn: { padding: 4, marginRight: 8, marginTop: 4 },
    rowInputs: { flex: 1 },
    rowLabel: { fontSize: 11, color: '#999', marginBottom: 4 },
    input: {
        borderWidth: 1,
        borderColor: '#EFE9E3',
        borderRadius: 8,
        padding: 8,
        fontSize: 14,
        marginBottom: 12,
        backgroundColor: '#FAFAFA'
    },
    rowMeta: { flexDirection: 'row' },

    footer: { padding: 24, paddingTop: 8, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#F0F0F0' },
    btn: {
        backgroundColor: '#C9B59C',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    btnTxt: { color: 'white', fontSize: 16, fontWeight: '700' },
    disabled: { opacity: 0.7 },
    cancelBtn: { alignItems: 'center', marginTop: 16 },
    cancelTxt: { color: '#999' },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        minHeight: 400,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: { fontSize: 20, fontWeight: '700', color: '#2D2D2D' },
    emptyState: { alignItems: 'center', padding: 32 },
    emptyTxt: { fontSize: 18, color: '#2D2D2D', marginBottom: 8 },
    emptySub: { fontSize: 14, color: '#999' },

    createBtn: {
        flexDirection: 'row',
        backgroundColor: '#2D2D2D',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
    },
    createBtnTxt: { color: 'white', fontSize: 16, fontWeight: '600' },

    locItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#F9F9F9',
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    locItemSelected: {
        borderColor: '#C9B59C',
        backgroundColor: '#FCF8F4',
    },
    locName: { fontSize: 16, fontWeight: '600', color: '#2D2D2D' },
    locRoom: { fontSize: 13, color: '#999' },

    createForm: { flex: 1 },
    inputLabel: { fontSize: 12, fontWeight: '600', color: '#2D2D2D', marginBottom: 8, marginTop: 16 },
    modalInput: {
        borderWidth: 1,
        borderColor: '#EFE9E3',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        backgroundColor: '#FAFAFA'
    },
    modalActions: { flexDirection: 'row', marginTop: 32, gap: 12 },
    outlineBtn: { flex: 1, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#EFE9E3', alignItems: 'center' },
    outlineBtnTxt: { color: '#666', fontWeight: '600' },
    primaryBtn: { flex: 2, padding: 16, borderRadius: 12, backgroundColor: '#C9B59C', alignItems: 'center' },
    primaryBtnTxt: { color: 'white', fontWeight: '600' },
});

export default ReviewScreen;
