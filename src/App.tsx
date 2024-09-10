import { Canvas, useThree } from '@react-three/fiber'
import './App.css'
import { BakeShadows, CameraControls, TransformControls, useDepthBuffer } from '@react-three/drei'
import { useControls } from 'leva';
import { useMemo } from 'react';
import { DoubleSide, NormalBlending, Vector2 } from 'three';


const vertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vec4 modelNormal = modelMatrix * vec4(normal, 0.0);
  vec4 mvPosition = viewMatrix * worldPos;
  gl_Position = projectionMatrix * mvPosition;
  vNormal = modelNormal.xyz;
  vPosition = worldPos.xyz;
}
`;

const fragmentShader = `
uniform sampler2D uDepthTexture; 
uniform vec2 uResolution;
uniform float uNear;
uniform float uFar;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

#include <packing>


float LinearizeDepth(float depth) {
	float zNdc = 2.0 * depth - 1.0;
	float zEye = (2.0 * uFar * uNear) / ((uFar + uNear) - zNdc * (uFar - uNear));
	float linearDepth = (zEye - uNear) / (uFar - uNear);
	return linearDepth;
}

void main() {

  vec3 normal = normalize(vNormal);
  if(gl_FrontFacing) {
    normal *= -1.0;
  }

  vec3 viewDirection = normalize(cameraPosition - vPosition);
  float fresnel = 1. + dot(normal, viewDirection);
  fresnel = pow(fresnel, 4.0);

  vec2 worldCoords = gl_FragCoord.xy/uResolution;

  float sceneDepth = LinearizeDepth(texture2D(uDepthTexture, worldCoords).r);
  float bubbleDepth = LinearizeDepth(gl_FragCoord.z);

  float difference = abs( sceneDepth - bubbleDepth);
  float threshold = 0.0001;
  float normalizedDistance = clamp(difference / threshold, 0.0, 1.0);
  vec4 intersection = mix(vec4(1.0), vec4(0.0), normalizedDistance);
  vec4 color = vec4(1.0, 0.4, 0.2, 0.3);
  gl_FragColor = color  + intersection + vec4(fresnel);
  // gl_FragColor = vec4(fresnel, fresnel, fresnel, 1.0);
}
`;

const Shield = () => {
  const db = useDepthBuffer({ size: 1024 });

  const { radius } = useControls({
    radius: {
      value: 3,
      max: 5,
      min: 1,
    },
    color: {
      value: "#fff",
    },
  });

  const size = useThree((state) => state.size);
  const dpr = useThree((state) => state.viewport.dpr);
  const camera = useThree((state) => state.camera);

  const uniforms = useMemo(
    () => ({
      uDepthTexture: {
        value: db,
      },
      uResolution: {
        value: new Vector2(size.width * dpr, size.height * dpr),
      },
      uNear: {
        value: camera.near,
      },
      uFar: {
        value: camera.far,
      },
    }),
    [db, size, camera]
  );

  return (
    <>
      <TransformControls mode="translate">
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[radius, 64, 64]} />
          <shaderMaterial
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
            uniforms={uniforms}
            transparent={true}
            blending={NormalBlending}
            depthWrite={false}
            side={DoubleSide}
          />
        </mesh>
      </TransformControls>
    </>
  );
};


const World = () => {
  const dist = 3;
  return (
    <>
      <mesh castShadow position={[0, 0, -dist]} >
        <boxGeometry  />
        <meshStandardMaterial color={"hotpink"} />
      </mesh>
      <mesh castShadow position={[dist, 0, 0]} >
        <coneGeometry  />
        <meshStandardMaterial color={"tomato"} />
      </mesh>
      <mesh castShadow rotation={[-Math.PI/2, 0, 0]} position={[0, 0, dist]} >
        <torusGeometry  />
        <meshStandardMaterial color={"yellowgreen"} />
      </mesh>
      <mesh castShadow position={[-dist, 0, 0]} >
        <cylinderGeometry  />
        <meshStandardMaterial color={"lightblue"} />
      </mesh>
      <mesh receiveShadow rotation={[-Math.PI/2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color={"white"} />
      </mesh>
    </>
  )
}


function App() {

  return (
    <>
      <div 
        style={{
          height: "100vh"
        }}
      >
        <Canvas
          gl={{
            antialias: true,
            depth: true,
            stencil: true,
            alpha: true
          }}
          shadows
          camera={{
            position: [0, 5, 5]
          }}
        >
          <color attach="background" args={["black"]} />
          <ambientLight intensity={0.5} />
          <directionalLight
            castShadow
            position={[2,2,2]}
            intensity={1}
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <World/>
          <Shield/>
          <CameraControls makeDefault />
          <BakeShadows/>
        </Canvas>
      </div>
    </>
  )
}

export default App
