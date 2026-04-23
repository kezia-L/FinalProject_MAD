// app/(tabs)/scan.tsx
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useAction, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { COLORS } from "../../lib/constants";
import { ScanOverlay } from "../../components/ScanOverlay";
import { prepareImageForAI } from "../../lib/imageAnalyzer";
import { useAppStore } from "../../store/useAppStore";
import { Id } from "../../convex/_generated/dataModel";
import { FoodAnalysis } from "../../lib/types";

export default function ScanScreen() {
  const router = useRouter();
  const { userId } = useAppStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing] = useState<CameraType>("back");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  const analyzeFood = useAction(api.aiScan.analyzeFood);
  const saveScan = useMutation(api.scanHistory.saveScan);
  const generateUploadUrl = useMutation(api.scanHistory.generateUploadUrl);

  const processImage = async (uri: string) => {
    if (!userId) {
      Alert.alert("Error", "Silakan login terlebih dahulu");
      return;
    }
    setCapturedImage(uri);
    setIsAnalyzing(true);
    try {
      const base64 = await prepareImageForAI(uri);
      const result = await analyzeFood({ imageBase64: base64, mimeType: "image/jpeg" });

      if (!result.success || !result.data) {
        Alert.alert("Analisis Gagal", "Gagal memproses gambar. Coba lagi.");
        return;
      }

      if (result.isFood === false) {
        Alert.alert(
          "Bukan Makanan",
          "Maaf, objek ini sepertinya bukan makanan atau minuman. Silakan ambil foto makanan Anda untuk dianalisis.",
          [{ text: "Coba Lagi", onPress: () => setCapturedImage(null) }]
        );
        return;
      }

      // UPLOAD IMAGE TO CONVEX
      let imageStorageId = undefined;
      try {
        const uploadUrl = await generateUploadUrl();
        const imageResponse = await fetch(uri);
        const imageBlob = await imageResponse.blob();
        
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "image/jpeg" },
          body: imageBlob,
        });

        if (uploadResponse.ok) {
          const { storageId } = await uploadResponse.json();
          imageStorageId = storageId;
        }
      } catch (uploadErr) {
        console.error("Gagal upload gambar ke storage:", uploadErr);
      }

      const food = result.data as FoodAnalysis;
      const scanId = await saveScan({
        userId: userId as Id<"users">,
        detectedFood: food.detectedFood,
        confidence: food.confidence,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        portionGram: food.portionGram,
        aiAnalysis: JSON.stringify(food),
        imageStorageId: imageStorageId as Id<"_storage"> | undefined,
      });

      router.push(`/scan_result/${scanId}`);
    } catch (err: any) {
      console.error(err);
      const errorMessage = err.message || "Terjadi kesalahan saat menganalisis gambar";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsAnalyzing(false);
      // Jika gagal, kita biarkan fotonya tertutup agar bisa coba lagi
      // Jika sukses, router.push akan memindahkan layar sehingga ini tidak masalah
    }
  };

  const handleCancel = () => {
    setCapturedImage(null);
    setIsAnalyzing(false);
  };

  const handleCapture = async () => {
    if (!cameraRef.current || isAnalyzing) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      if (photo?.uri) await processImage(photo.uri);
    } catch {
      Alert.alert("Error", "Gagal mengambil foto");
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await processImage(result.assets[0].uri);
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionEmoji}>📷</Text>
          <Text style={styles.permissionTitle}>Izin Kamera Diperlukan</Text>
          <Text style={styles.permissionDesc}>
            HealthMate membutuhkan akses kamera untuk memindai makananmu
          </Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>Izinkan Akses Kamera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.galleryBtn} onPress={handlePickImage}>
            <Text style={styles.galleryBtnText}>Pilih dari Galeri</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing}>
        <ScanOverlay isScanning={isAnalyzing} />

        {/* Top bar */}
        <SafeAreaView style={styles.topBar}>
          <Text style={styles.topTitle}>Scan Makanan</Text>
        </SafeAreaView>

        {/* Captured Image Preview during analysis */}
        {capturedImage && (
          <Image source={{ uri: capturedImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        )}

        {/* Analyzing overlay */}
        {isAnalyzing && (
          <View style={styles.analyzingOverlay}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.analyzingText}>Menganalisis makanan...</Text>
            <Text style={styles.analyzingSubText}>Mohon tunggu sebentar</Text>
            
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelBtnText}>Batalkan</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.galleryControl}
            onPress={handlePickImage}
            disabled={isAnalyzing}
          >
            <Text style={styles.controlIcon}>🖼️</Text>
            <Text style={styles.controlLabel}>Galeri</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.captureBtn, isAnalyzing && styles.captureBtnDisabled]}
            onPress={handleCapture}
            disabled={isAnalyzing}
            activeOpacity={0.8}
          >
            <View style={styles.captureBtnInner} />
          </TouchableOpacity>

          <View style={styles.galleryControl} />
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  topBar: {
    alignItems: "center",
    paddingTop: Platform.OS === "android" ? 40 : 0,
    paddingBottom: 8,
  },
  topTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: "hidden",
  },
  controls: {
    position: "absolute",
    bottom: 60,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 40,
  },
  galleryControl: {
    alignItems: "center",
    width: 60,
  },
  controlIcon: { fontSize: 28 },
  controlLabel: { color: "#fff", fontSize: 11, marginTop: 4 },
  captureBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  captureBtnDisabled: { opacity: 0.5 },
  captureBtnInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
  },
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  analyzingText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  analyzingSubText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
  },
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  permissionEmoji: { fontSize: 64, marginBottom: 16 },
  permissionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text.primary,
    marginBottom: 8,
    textAlign: "center",
  },
  permissionDesc: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  permissionBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
    marginBottom: 12,
    width: "100%",
    alignItems: "center",
  },
  permissionBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  galleryBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
    width: "100%",
    alignItems: "center",
  },
  galleryBtnText: { color: COLORS.primary, fontWeight: "700", fontSize: 15 },
  cancelBtn: {
    marginTop: 30,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  cancelBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
