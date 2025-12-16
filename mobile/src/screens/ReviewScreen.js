import React, { useState, useEffect } from 'react';
import { View, Text, Image, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { analyzeImageWithGemini } from '../lib/gemini';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

const ReviewScreen = ({ route, navigation }) => {
    const { imageUri } = route.params;

    // State for List of Items
    const [items, setItems] = useState([]);
    const [analyzing, setAnalyzing] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        runAnalysis();
    }, []);

    const runAnalysis = async () => {
        try {
            setAnalyzing(true);
            const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: FileSystem.EncodingType.Base64 });

            // Call Gemini
            const detectedItems = await analyzeImageWithGemini(base64);

            if (detectedItems && detectedItems.length > 0) {
                setItems(detectedItems);
            } else {
                // Fallback if AI fails or finds nothing
                setItems([{ name: 'Unknown Item', category: 'General', quantity: 1 }]);
            }

        } catch (error) {
            console.log("Analysis error:", error);
            // Show the actual error to the user for debugging
            Alert.alert("Analysis Failed", error.message || JSON.stringify(error));
            setItems([{ name: 'Error scanning item', category: 'General', quantity: 1 }]);
        } finally {
            setAnalyzing(false);
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

        setSaving(true);
        try {
            // 1. Upload Image (Once for the batch)
            const fileName = `scans/${Date.now()}.jpg`;
            const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: FileSystem.EncodingType.Base64 });

            const { error: uploadError } = await supabase.storage
                .from('inventory-images')
                .upload(fileName, decode(base64), { contentType: 'image/jpeg' });

            let publicUrl = null;
            if (!uploadError) {
                const { data } = supabase.storage.from('inventory-images').getPublicUrl(fileName);
                publicUrl = data.publicUrl;
            }

            // 2. Resolve Storage Unit
            const { data: storageData } = await supabase.from('storage_units').select('id').limit(1);
            let storageId = storageData?.[0]?.id;

            if (!storageId) {
                // Quick Fix: Create logic omitted for brevity, ensure DB is seeded or handle error
                Alert.alert("Error", "No storage units found.");
                setSaving(false);
                return;
            }

            // 3. Prepare Bulk Insert
            const records = items.map(item => ({
                name: item.name,
                quantity: Number(item.quantity) || 1,
                category: item.category,
                image_url: publicUrl,
                storage_id: storageId,
                detected_labels: ["ai-import"] // Optional marker
            }));

            const { error: dbError } = await supabase.from('items').insert(records);

            if (dbError) throw dbError;

            Alert.alert("Success", `Saved ${items.length} items!`);
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
                </View>

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

    listContainer: {
        flex: 1,
        borderRadius: 24,
        marginTop: -20,
        backgroundColor: '#F9F8F6',
        overflow: 'hidden',
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
    cancelTxt: { color: '#999' }
});

export default ReviewScreen;
