#!/usr/bin/env python3
"""
Build script for Render deployment.
Generates datasets and trains ML models with proper error handling.
"""
import sys
import traceback

def main():
    try:
        print("=" * 60)
        print("STEP 1: Generating Datasets")
        print("=" * 60)
        
        from app.data.dataset_loader import generate_all_datasets
        generate_all_datasets()
        
        print("\n" + "=" * 60)
        print("STEP 2: Training ML Models")
        print("=" * 60)
        
        from app.ml.trainer import train_all_models
        train_all_models()

        print("\n" + "=" * 60)
        print("STEP 3: Training Clinical Notes NLP Model")
        print("=" * 60)

        from app.ml.nlp_analyzer import train_clinical_notes_model
        notes_result = train_clinical_notes_model()
        print(f"Clinical notes model trained: accuracy={notes_result['accuracy']}, "
              f"samples={notes_result['n_samples']}")

        print("\n" + "=" * 60)
        print("STEP 4: Training Lesion Image Classifier (Classical CV)")
        print("=" * 60)

        from app.ml.lesion_analyzer import train_lesion_classifier
        lesion_result = train_lesion_classifier()
        print(f"Lesion classifier trained: accuracy={lesion_result['accuracy']}, "
              f"samples={lesion_result['n_samples']}")

        print("\n" + "=" * 60)
        print("BUILD SUCCESSFUL ✓")
        print("=" * 60)
        return 0
        
    except Exception as e:
        print("\n" + "=" * 60)
        print("BUILD FAILED ✗")
        print("=" * 60)
        print(f"\nError: {e}")
        print("\nFull traceback:")
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())