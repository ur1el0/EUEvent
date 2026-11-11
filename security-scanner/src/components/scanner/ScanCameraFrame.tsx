import { StyleSheet, View } from 'react-native';
import { CameraView, type BarcodeScanningResult } from 'expo-camera';
import { colors } from '../../theme';

type ScanCameraFrameProps = {
  active: boolean;
  isScanning: boolean;
  /** Shrinks the preview while a decision is on screen so the decision gets the space. */
  compact: boolean;
  onBarcodeScanned: (result: BarcodeScanningResult) => void;
};

export function ScanCameraFrame({ active, isScanning, compact, onBarcodeScanned }: ScanCameraFrameProps) {
  return (
    <View style={[styles.cameraFrame, compact && styles.cameraFrameCompact]}>
      <CameraView
        style={styles.camera}
        facing="back"
        active={active}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={isScanning ? onBarcodeScanned : undefined}
      />
      {isScanning ? (
        <View pointerEvents="none" style={styles.scanGuide}>
          <View style={styles.scanGuideCorner} />
          <View style={[styles.scanGuideCorner, styles.scanGuideTopRight]} />
          <View style={[styles.scanGuideCorner, styles.scanGuideBottomLeft]} />
          <View style={[styles.scanGuideCorner, styles.scanGuideBottomRight]} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cameraFrame: { height: 340, overflow: 'hidden', borderRadius: 24, backgroundColor: '#100707', borderWidth: 1, borderColor: colors.border },
  cameraFrameCompact: { height: 150 },
  camera: { flex: 1 },
  scanGuide: { position: 'absolute', width: 230, height: 230, left: '50%', top: '50%', marginLeft: -115, marginTop: -115 },
  scanGuideCorner: { position: 'absolute', width: 38, height: 38, borderColor: colors.gold, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 18, left: 0, top: 0 },
  scanGuideTopRight: { left: undefined, right: 0, borderLeftWidth: 0, borderRightWidth: 4, borderTopLeftRadius: 0, borderTopRightRadius: 18 },
  scanGuideBottomLeft: { top: undefined, bottom: 0, borderTopWidth: 0, borderBottomWidth: 4, borderTopLeftRadius: 0, borderBottomLeftRadius: 18 },
  scanGuideBottomRight: { left: undefined, top: undefined, right: 0, bottom: 0, borderTopWidth: 0, borderLeftWidth: 0, borderRightWidth: 4, borderBottomWidth: 4, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 18 },
});
