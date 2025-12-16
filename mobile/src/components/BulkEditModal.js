import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const BulkEditModal = ({ visible, selectedCount, onClose, onSubmit }) => {
    const [newName, setNewName] = useState('');
    const [newPhoto, setNewPhoto] = useState(null);

    const handlePickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please allow access to your photos');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setNewPhoto(result.assets[0].uri);
        }
    };

    const handleSubmit = () => {
        if (!newName.trim() && !newPhoto) {
            Alert.alert('No Changes', 'Please enter a new name or select a new photo');
            return;
        }

        const updates = {};
        if (newName.trim()) {
            updates.name = newName.trim();
        }
        if (newPhoto) {
            updates.photo = newPhoto;
        }

        onSubmit(updates);
        handleClose();
    };

    const handleClose = () => {
        setNewName('');
        setNewPhoto(null);
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Bulk Edit Items</Text>
                        <TouchableOpacity onPress={handleClose}>
                            <MaterialIcons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.modalSubtitle}>
                        Editing {selectedCount} item{selectedCount !== 1 ? 's' : ''}
                    </Text>

                    <Text style={styles.infoText}>
                        Only the fields you change will be updated. Leave fields empty to keep original values.
                    </Text>

                    <ScrollView style={styles.formContainer}>
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>New Name (optional)</Text>
                            <TextInput
                                style={styles.input}
                                value={newName}
                                onChangeText={setNewName}
                                placeholder="Enter new name for all items"
                                placeholderTextColor="#999"
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>New Photo (optional)</Text>
                            <TouchableOpacity style={styles.photoBtn} onPress={handlePickImage}>
                                <MaterialIcons name="photo-library" size={24} color="#C9B59C" />
                                <Text style={styles.photoBtnText}>
                                    {newPhoto ? 'Photo Selected ✓' : 'Pick Photo'}
                                </Text>
                            </TouchableOpacity>
                            {newPhoto && (
                                <TouchableOpacity
                                    style={styles.clearPhotoBtn}
                                    onPress={() => setNewPhoto(null)}
                                >
                                    <Text style={styles.clearPhotoText}>Clear Photo</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </ScrollView>

                    <View style={styles.modalActions}>
                        <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={handleClose}
                        >
                            <Text style={styles.cancelBtnTxt}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.submitBtn}
                            onPress={handleSubmit}
                        >
                            <Text style={styles.submitBtnTxt}>Apply Changes</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
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
        marginBottom: 12,
    },
    infoText: {
        fontSize: 13,
        color: '#666',
        backgroundColor: '#F9F9F9',
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
        fontStyle: 'italic',
    },
    formContainer: {
        marginBottom: 20,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2D2D2D',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#EFE9E3',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        backgroundColor: '#FAFAFA',
        color: '#2D2D2D',
    },
    photoBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: 16,
        borderWidth: 1,
        borderColor: '#C9B59C',
        borderRadius: 12,
        backgroundColor: '#FCF8F4',
    },
    photoBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#C9B59C',
    },
    clearPhotoBtn: {
        marginTop: 8,
        padding: 8,
        alignItems: 'center',
    },
    clearPhotoText: {
        fontSize: 14,
        color: '#FF6B6B',
        fontWeight: '500',
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

export default BulkEditModal;
