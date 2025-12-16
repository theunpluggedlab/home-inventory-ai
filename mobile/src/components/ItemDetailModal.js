import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Modal, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase, uploadImage } from '../lib/supabase';

const ItemDetailModal = ({ visible, item, onClose, onUpdate, onMove }) => {
    const [uploading, setUploading] = useState(false);

    if (!item) return null;

    const handleEditPhoto = async () => {
        Alert.alert(
            "Change Photo",
            "Choose a source",
            [
                {
                    text: "Take Photo",
                    onPress: async () => {
                        const permission = await ImagePicker.requestCameraPermissionsAsync();
                        if (!permission.granted) {
                            Alert.alert("Permission Denied", "Camera access is required");
                            return;
                        }

                        const result = await ImagePicker.launchCameraAsync({
                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                            allowsEditing: true,
                            quality: 0.7,
                        });

                        if (!result.canceled) {
                            await updateItemPhoto(result.assets[0].uri);
                        }
                    }
                },
                {
                    text: "Choose from Gallery",
                    onPress: async () => {
                        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (!permission.granted) {
                            Alert.alert("Permission Denied", "Gallery access is required");
                            return;
                        }

                        const result = await ImagePicker.launchImageLibraryAsync({
                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                            allowsEditing: true,
                            quality: 0.7,
                        });

                        if (!result.canceled) {
                            await updateItemPhoto(result.assets[0].uri);
                        }
                    }
                },
                {
                    text: "Cancel",
                    style: "cancel"
                }
            ]
        );
    };

    const updateItemPhoto = async (uri) => {
        try {
            setUploading(true);

            // Upload new image
            const publicUrl = await uploadImage(uri);

            // Update database
            const { error } = await supabase
                .from('items')
                .update({ image_url: publicUrl })
                .eq('id', item.id);

            if (error) throw error;

            Alert.alert("Success", "Photo updated successfully!");
            onUpdate(); // Refresh parent list
        } catch (err) {
            Alert.alert("Error", "Failed to update photo: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleRemovePhoto = () => {
        Alert.alert(
            "Remove Photo",
            "Are you sure you want to remove this photo?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('items')
                                .update({ image_url: null })
                                .eq('id', item.id);

                            if (error) throw error;

                            Alert.alert("Success", "Photo removed successfully!");
                            onUpdate(); // Refresh parent list
                        } catch (err) {
                            Alert.alert("Error", "Failed to remove photo: " + err.message);
                        }
                    }
                }
            ]
        );
    };

    const handleDeleteItem = () => {
        Alert.alert(
            "Delete Item",
            `Are you sure you want to delete "${item.name}"? This cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('items')
                                .delete()
                                .eq('id', item.id);

                            if (error) throw error;

                            Alert.alert("Success", "Item deleted successfully!");
                            onClose(); // Close modal
                            onUpdate(); // Refresh parent list
                        } catch (err) {
                            Alert.alert("Error", "Failed to delete item: " + err.message);
                        }
                    }
                }
            ]
        );
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={false}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Item Details</Text>
                    <TouchableOpacity onPress={onClose}>
                        <MaterialIcons name="close" size={28} color="#2D2D2D" />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    {/* Image Section */}
                    <View style={styles.imageSection}>
                        {uploading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#C9B59C" />
                                <Text style={styles.loadingText}>Uploading...</Text>
                            </View>
                        ) : item.image_url ? (
                            <Image source={{ uri: item.image_url }} style={styles.itemImage} />
                        ) : (
                            <View style={styles.noImage}>
                                <MaterialIcons name="image" size={64} color="#CCC" />
                                <Text style={styles.noImageText}>No photo</Text>
                            </View>
                        )}
                    </View>

                    {/* Item Info */}
                    <View style={styles.infoSection}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Quantity:</Text>
                            <Text style={styles.infoValue}>{item.quantity}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Category:</Text>
                            <Text style={styles.infoValue}>{item.category || 'General'}</Text>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionsSection}>
                        <TouchableOpacity style={styles.actionBtn} onPress={handleEditPhoto}>
                            <MaterialIcons name="photo-camera" size={24} color="#C9B59C" />
                            <Text style={styles.actionBtnText}>Edit Photo</Text>
                        </TouchableOpacity>

                        {item.image_url && (
                            <TouchableOpacity style={styles.actionBtn} onPress={handleRemovePhoto}>
                                <MaterialIcons name="delete-outline" size={24} color="#666" />
                                <Text style={styles.actionBtnText}>Remove Photo</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity style={styles.actionBtn} onPress={onMove}>
                            <MaterialIcons name="drive-file-move" size={24} color="#C9B59C" />
                            <Text style={styles.actionBtnText}>Move Item</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteItem}>
                            <MaterialIcons name="delete-forever" size={24} color="white" />
                            <Text style={styles.deleteBtnText}>Delete Item</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9F8F6',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingTop: 60,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#EFE9E3',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#2D2D2D',
    },
    content: {
        padding: 24,
    },
    imageSection: {
        marginBottom: 24,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#000',
    },
    itemImage: {
        width: '100%',
        height: 300,
        resizeMode: 'contain',
    },
    loadingContainer: {
        width: '100%',
        height: 300,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F0F0F0',
    },
    loadingText: {
        marginTop: 12,
        color: '#666',
        fontSize: 14,
    },
    noImage: {
        width: '100%',
        height: 300,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F0F0F0',
    },
    noImageText: {
        marginTop: 12,
        color: '#999',
        fontSize: 16,
    },
    infoSection: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
    },
    itemName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#2D2D2D',
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    infoLabel: {
        fontSize: 16,
        color: '#666',
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2D2D2D',
    },
    actionsSection: {
        gap: 12,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EFE9E3',
        gap: 8,
    },
    actionBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2D2D2D',
    },
    deleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FF6B6B',
        padding: 16,
        borderRadius: 12,
        gap: 8,
        marginTop: 12,
    },
    deleteBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
});

export default ItemDetailModal;
