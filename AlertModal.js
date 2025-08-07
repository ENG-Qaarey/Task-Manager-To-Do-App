import React, { useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const AlertModal = ({ 
  visible = false,
  type = 'info',
  title = 'Alert',
  message = '',
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  showCancel = true
}) => {
  const scaleValue = useRef(new Animated.Value(0)).current;
  const fadeValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeValue, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleValue, {
          toValue: 1,
          damping: 15,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeValue, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [visible]);

  const getIcon = () => {
    const icons = {
      success: { name: 'checkmark-circle', color: '#10b981' },
      error: { name: 'close-circle', color: '#ef4444' },
      warning: { name: 'warning', color: '#f59e0b' },
      confirm: { name: 'help-circle', color: '#3b82f6' },
      info: { name: 'information-circle', color: '#6366f1' }
    };
    const icon = icons[type] || icons.info;
    return <Ionicons name={icon.name} size={48} color={icon.color} />;
  };

  const getColor = () => {
    const colors = {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      confirm: '#3b82f6',
      info: '#6366f1'
    };
    return colors[type] || colors.info;
  };

  return (
    <Modal transparent visible={visible} animationType="none">
      <Animated.View style={[styles.backdrop, { opacity: fadeValue }]}>
        <Animated.View style={[
          styles.modal, 
          { 
            transform: [{ scale: scaleValue }],
            shadowColor: getColor(),
          }
        ]}>
          <View style={styles.iconContainer}>
            {getIcon()}
          </View>
          
          <Text style={styles.title}>{title}</Text>
          
          {message && <Text style={styles.message}>{message}</Text>}
          
          <View style={styles.buttons}>
            {showCancel && (
              <Pressable 
                style={({ pressed }) => [
                  styles.button, 
                  styles.cancelButton,
                  pressed && styles.pressed
                ]}
                onPress={onCancel}
              >
                <Text style={styles.cancelText}>{cancelText}</Text>
              </Pressable>
            )}
            
            <Pressable 
              style={({ pressed }) => [
                styles.button, 
                { backgroundColor: getColor() },
                pressed && styles.pressed
              ]}
              onPress={onConfirm}
            >
              <Text style={styles.confirmText}>{confirmText}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    width: '100%',
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#334155',
  },
  cancelText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  confirmText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});

export default AlertModal;