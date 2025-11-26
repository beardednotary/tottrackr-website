import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet
} from 'react-native';

export function FeedingModal({ visible, onClose, onSave }) {
  const [feedingType, setFeedingType] = useState(null);
  
  const handleSave = (amount) => {
    onSave('feeding', {
      feedingType,
      amount
    });
    setFeedingType(null);
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add Feeding</Text>
          
          <View style={styles.typeContainer}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                feedingType === 'formula' && styles.selectedButton
              ]}
              onPress={() => setFeedingType('formula')}
            >
              <Text>Formula</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.typeButton,
                feedingType === 'breastmilk' && styles.selectedButton
              ]}
              onPress={() => setFeedingType('breastmilk')}
            >
              <Text>Breast Milk</Text>
            </TouchableOpacity>
          </View>

          {feedingType && (
            <View style={styles.amountContainer}>
              {[2, 4, 6, 8].map(amount => (
                <TouchableOpacity
                  key={amount}
                  style={styles.amountButton}
                  onPress={() => handleSave(amount)}
                >
                  <Text>{amount} oz</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
          >
            <Text>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 22,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16
  },
  typeButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center'
  },
  selectedButton: {
    backgroundColor: '#E3F2FD'
  },
  amountContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16
  },
  amountButton: {
    width: '48%',
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center'
  },
  cancelButton: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center'
  }
});