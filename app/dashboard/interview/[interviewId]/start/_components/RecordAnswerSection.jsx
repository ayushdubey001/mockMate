"use client";

import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import * as faceapi from "face-api.js";
import { useEffect, useState, useRef } from "react";
import Webcam from "react-webcam";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const RecordAnswerSection = ({ mockInterviewQuestion, activeQuestionIndex, interviewData, onAnswerSave }) => {
  const [userAnswer, setUserAnswer] = useState("");
  const [webCamEnabled, setWebCamEnabled] = useState(false);
  const [emotions, setEmotions] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        // Set TensorFlow backend
        await tf.setBackend("webgl");
        await tf.ready();

        // Load models
        const MODEL_URL = "/models";
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);

        setModelsLoaded(true);
        toast.success("Face detection models loaded successfully");
      } catch (error) {
        toast.error("Failed to load face detection models");
        console.error("Model loading error:", error);
      }
    };

    loadModels();
  }, []);

  const handleWebcamToggle = () => {
    if (!webCamEnabled) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then(() => {
          setWebCamEnabled(true);
          toast.success("Webcam enabled");
        })
        .catch((error) => {
          toast.error("Failed to access webcam");
          console.error("Webcam access error:", error);
        });
    } else {
      setWebCamEnabled(false);
    }
  };

  const detectEmotions = async () => {
    if (
      !modelsLoaded ||
      !webcamRef.current ||
      webcamRef.current.video.readyState !== 4
    ) {
      return;
    }

    const video = webcamRef.current.video;

    try {
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions();

      if (detections.length > 0) {
        const emotionsDetected = detections[0].expressions;
        setEmotions(emotionsDetected);

        const canvas = canvasRef.current;
        const displaySize = {
          width: video.videoWidth,
          height: video.videoHeight,
        };
        faceapi.matchDimensions(canvas, displaySize);
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        faceapi.draw.drawDetections(canvas, resizedDetections);
        faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
      } else {
        setEmotions(null);
      }
    } catch (error) {
      console.error("Emotion detection error:", error);
    }
  };

  useEffect(() => {
    if (webCamEnabled && modelsLoaded) {
      const interval = setInterval(detectEmotions, 1000);
      return () => clearInterval(interval);
    }
  }, [webCamEnabled, modelsLoaded]);

  return (
    <div className="flex justify-center items-center flex-col relative">
      <div className="flex flex-col my-20 justify-center items-center bg-black rounded-lg p-5">
        {webCamEnabled ? (
          <>
            <Webcam
              ref={webcamRef}
              mirrored={true}
              style={{ height: 300, width: "auto" }}
              onUserMedia={() => setWebCamEnabled(true)}
              onUserMediaError={() => {
                toast.error("Webcam access error");
                setWebCamEnabled(false);
              }}
            />
            <canvas
              ref={canvasRef}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                height: 300,
                width: "auto",
              }}
            />
          </>
        ) : (
          <Button className="w-full" variant="ghost" onClick={handleWebcamToggle}>
            Enable Webcam
          </Button>
        )}
      </div>

      {emotions && (
        <div className="mt-4">
          <h3 className="text-lg font-bold">Detected Emotions:</h3>
          <ul>
            {Object.entries(emotions).map(([emotion, value]) => (
              <li key={emotion}>
                {emotion}: {(value * 100).toFixed(2)}%
              </li>
            ))}
          </ul>
        </div>
      )}

      <textarea
        className="w-full h-32 p-4 mt-4 border rounded-md text-gray-800"
        placeholder="Your answer will appear here..."
        value={userAnswer}
        onChange={(e) => setUserAnswer(e.target.value)}
      />

      <Button className="mt-4" onClick={() => toast.success("Answer saved!")}>
        Save Answer
      </Button>
    </div>
  );
};

export default RecordAnswerSection;
