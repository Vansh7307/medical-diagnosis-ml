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
