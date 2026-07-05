"""
Model versioning module.
Tracks model versions with metadata, supports rollback and lineage tracking.
"""
import os
import json
import shutil
from datetime import datetime, timezone


class ModelVersionManager:
    """Manages model versions and metadata."""
    
    def __init__(self, versions_dir=None):
        self.versions_dir = versions_dir or os.path.join(
            os.path.dirname(__file__), 'model_versions'
        )
        os.makedirs(self.versions_dir, exist_ok=True)
    
    def save_version(self, diagnosis_type, model_path, metadata):
        """
        Save a new model version.
        
        Args:
            diagnosis_type: Model type
            model_path: Path to the trained model file
            metadata: Dict with version info (metrics, timestamp, etc.)
        """
        # Create version directory
        version_id = metadata.get('model_version', datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S'))
        version_dir = os.path.join(self.versions_dir, diagnosis_type, version_id)
        os.makedirs(version_dir, exist_ok=True)
        
        # Copy model file
        if os.path.exists(model_path):
            dest = os.path.join(version_dir, os.path.basename(model_path))
            shutil.copy2(model_path, dest)
        
        # Save metadata
        metadata['saved_at'] = datetime.now(timezone.utc).isoformat()
        metadata_path = os.path.join(version_dir, 'metadata.json')
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        # Update version index
        self._update_index(diagnosis_type, version_id, metadata)
        
        return version_id
    
    def get_versions(self, diagnosis_type):
        """Get all versions for a model type."""
        index_path = os.path.join(
            self.versions_dir, diagnosis_type, 'versions_index.json'
        )
        
        if os.path.exists(index_path):
            with open(index_path, 'r') as f:
                return json.load(f)
        return []
    
    def get_latest_version(self, diagnosis_type):
        """Get the latest version metadata."""
        versions = self.get_versions(diagnosis_type)
        if versions:
            return versions[-1]
        return None
    
    def get_version(self, diagnosis_type, version_id):
        """Get specific version metadata."""
        version_dir = os.path.join(self.versions_dir, diagnosis_type, version_id)
        metadata_path = os.path.join(version_dir, 'metadata.json')
        
        if os.path.exists(metadata_path):
            with open(metadata_path, 'r') as f:
                return json.load(f)
        return None
    
    def rollback(self, diagnosis_type, version_id, models_dir):
        """
        Rollback to a specific model version.
        
        Args:
            diagnosis_type: Model type
            version_id: Target version to rollback to
            models_dir: Directory where active models are stored
        """
        version_dir = os.path.join(self.versions_dir, diagnosis_type, version_id)
        
        if not os.path.exists(version_dir):
            raise FileNotFoundError(f"Version {version_id} not found")
        
        # Find model file in version directory
        model_files = [f for f in os.listdir(version_dir) if f.endswith('.pkl')]
        if not model_files:
            raise FileNotFoundError(f"No model file found in version {version_id}")
        
        # Copy model back to active directory
        src = os.path.join(version_dir, model_files[0])
        dest = os.path.join(models_dir, f'{diagnosis_type}_pipeline.pkl')
        shutil.copy2(src, dest)
        
        # Update active metadata
        metadata = self.get_version(diagnosis_type, version_id)
        if metadata:
            metadata['rolled_back_at'] = datetime.now(timezone.utc).isoformat()
            active_metadata_path = os.path.join(
                models_dir, f'{diagnosis_type}_metadata.json'
            )
            with open(active_metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
        
        return version_id
    
    def get_lineage(self, diagnosis_type):
        """Get model lineage - chain of versions with their relationships."""
        versions = self.get_versions(diagnosis_type)
        
        lineage = {
            'diagnosis_type': diagnosis_type,
            'total_versions': len(versions),
            'versions': [],
        }
        
        for v in versions:
            lineage['versions'].append({
                'version_id': v['version_id'],
                'timestamp': v.get('timestamp'),
                'accuracy': v.get('metrics', {}).get('accuracy'),
                'f1_score': v.get('metrics', {}).get('f1_score'),
                'dataset_hash': v.get('dataset_hash'),
            })
        
        return lineage
    
    def _update_index(self, diagnosis_type, version_id, metadata):
        """Update the versions index file."""
        index_path = os.path.join(
            self.versions_dir, diagnosis_type, 'versions_index.json'
        )
        
        versions = []
        if os.path.exists(index_path):
            with open(index_path, 'r') as f:
                try:
                    versions = json.load(f)
                except json.JSONDecodeError:
                    versions = []
        
        versions.append({
            'version_id': version_id,
            'timestamp': metadata.get('trained_at', datetime.now(timezone.utc).isoformat()),
            'metrics': metadata.get('metrics', {}),
            'dataset_hash': metadata.get('dataset_hash', ''),
        })
        
        with open(index_path, 'w') as f:
            json.dump(versions, f, indent=2)
