from flask import Flask, jsonify, request

app = Flask(__name__)

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        "status": "success",
        "message": "Medical AI Backend is running smoothly on Render!"
    })

@app.route('/predict', methods=['POST'])
def predict():
    # This is a placeholder route for your Machine Learning model predictions later
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        return jsonify({
            "message": "Data received successfully by the model!",
            "prediction_placeholder": "Healthy / No Disease (Replace with actual ML model output)"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)