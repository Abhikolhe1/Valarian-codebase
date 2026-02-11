// import React, { useRef, useEffect, useState } from 'react';
// import { Box, Typography, Container } from '@mui/material';
// import { styled } from '@mui/material/styles';
// import * as THREE from 'three';

// // Styled Components
// const ProductSection = styled(Box)({
//   position: 'relative',
//   minHeight: '100vh',
//   display: 'flex',
//   alignItems: 'center',
//   justifyContent: 'center',
//   backgroundColor: '#f8f8f8',
//   padding: '60px 20px',
// });

// const ContentWrapper = styled(Container)({
//   maxWidth: '800px',
//   textAlign: 'center',
// });

// const SectionLabel = styled(Typography)({
//   fontFamily: '"Lato", "Helvetica", sans-serif',
//   fontSize: '0.75rem',
//   fontWeight: 400,
//   color: '#999999',
//   letterSpacing: '2px',
//   textTransform: 'uppercase',
//   marginBottom: '20px',
// });

// const ProductTitle = styled(Typography)({
//   fontFamily: '"Lora", "Georgia", serif',
//   fontSize: 'clamp(2rem, 5vw, 2.75rem)',
//   fontWeight: 600,
//   color: '#2c2c2c',
//   lineHeight: 1.3,
//   marginBottom: '16px',
//   letterSpacing: '-0.5px',
// });

// const ProductSubtitle = styled(Typography)({
//   fontFamily: '"Lato", "Helvetica", sans-serif',
//   fontSize: '1rem',
//   fontWeight: 400,
//   color: '#666666',
//   marginBottom: '50px',
//   letterSpacing: '0.3px',
// });

// const Canvas3D = styled(Box)({
//   width: '100%',
//   height: '500px',
//   position: 'relative',
//   cursor: 'grab',
//   '&:active': {
//     cursor: 'grabbing',
//   },
//   '@media (max-width: 768px)': {
//     height: '400px',
//   },
// });

// const InstructionText = styled(Typography)({
//   fontFamily: '"Lato", "Helvetica", sans-serif',
//   fontSize: '0.85rem',
//   fontWeight: 400,
//   color: '#999999',
//   marginTop: '30px',
//   fontStyle: 'italic',
// });

// const PremiumPoloViewer = () => {
//   const mountRef = useRef(null);
//   const [isLoading, setIsLoading] = useState(true);

//   useEffect(() => {
//     if (!mountRef.current) return;

//     // Scene setup
//     const scene = new THREE.Scene();
//     scene.background = new THREE.Color(0xf8f8f8);

//     // Camera setup
//     const camera = new THREE.PerspectiveCamera(
//       45,
//       mountRef.current.clientWidth / mountRef.current.clientHeight,
//       0.1,
//       1000
//     );
//     camera.position.set(0, 0, 5);

//     // Renderer setup
//     const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
//     renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
//     renderer.setPixelRatio(window.devicePixelRatio);
//     renderer.shadowMap.enabled = true;
//     renderer.shadowMap.type = THREE.PCFSoftShadowMap;
//     mountRef.current.appendChild(renderer.domElement);

//     // Lighting
//     const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
//     scene.add(ambientLight);

//     const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
//     directionalLight1.position.set(5, 5, 5);
//     directionalLight1.castShadow = true;
//     scene.add(directionalLight1);

//     const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
//     directionalLight2.position.set(-5, 3, -5);
//     scene.add(directionalLight2);

//     const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
//     fillLight.position.set(0, -5, 0);
//     scene.add(fillLight);

//     // Create polo shirt geometry
//     const group = new THREE.Group();

//     // Body of the polo
//     const bodyGeometry = new THREE.BoxGeometry(2.2, 2.8, 0.3);
//     const bodyMaterial = new THREE.MeshStandardMaterial({
//       color: 0xe8e8e8,
//       roughness: 0.7,
//       metalness: 0.1,
//     });
//     const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
//     body.castShadow = true;
//     body.receiveShadow = true;
//     group.add(body);

//     // Collar
//     const collarGeometry = new THREE.CylinderGeometry(0.4, 0.5, 0.3, 32);
//     const collarMaterial = new THREE.MeshStandardMaterial({
//       color: 0x6b8fbd,
//       roughness: 0.6,
//       metalness: 0.1,
//     });
//     const collar = new THREE.Mesh(collarGeometry, collarMaterial);
//     collar.position.set(0, 1.3, 0.15);
//     collar.rotation.x = Math.PI / 2;
//     collar.castShadow = true;
//     group.add(collar);

//     // Sleeves
//     const sleeveGeometry = new THREE.CylinderGeometry(0.25, 0.3, 0.8, 16);
//     const sleeveRightMaterial = new THREE.MeshStandardMaterial({
//       color: 0xe8e8e8,
//       roughness: 0.7,
//       metalness: 0.1,
//     });

//     // Right sleeve
//     const sleeveRight = new THREE.Mesh(sleeveGeometry, sleeveRightMaterial);
//     sleeveRight.position.set(1.2, 0.7, 0);
//     sleeveRight.rotation.z = Math.PI / 4;
//     sleeveRight.castShadow = true;
//     group.add(sleeveRight);

//     // Left sleeve
//     const sleeveLeft = new THREE.Mesh(sleeveGeometry, sleeveRightMaterial.clone());
//     sleeveLeft.position.set(-1.2, 0.7, 0);
//     sleeveLeft.rotation.z = -Math.PI / 4;
//     sleeveLeft.castShadow = true;
//     group.add(sleeveLeft);

//     // Sleeve trim (blue)
//     const trimGeometry = new THREE.TorusGeometry(0.28, 0.04, 8, 16);
//     const trimMaterial = new THREE.MeshStandardMaterial({
//       color: 0x6b8fbd,
//       roughness: 0.5,
//     });

//     const trimRight = new THREE.Mesh(trimGeometry, trimMaterial);
//     trimRight.position.set(1.2, 0.7, 0);
//     trimRight.rotation.z = Math.PI / 4;
//     group.add(trimRight);

//     const trimLeft = new THREE.Mesh(trimGeometry, trimMaterial.clone());
//     trimLeft.position.set(-1.2, 0.7, 0);
//     trimLeft.rotation.z = -Math.PI / 4;
//     group.add(trimLeft);

//     // Text on shirt - "Marlin Bailey"
//     const canvas = document.createElement('canvas');
//     const context = canvas.getContext('2d');
//     canvas.width = 512;
//     canvas.height = 256;

//     context.fillStyle = '#6b8fbd';
//     context.font = 'italic bold 48px Georgia, serif';
//     context.textAlign = 'center';
//     context.fillText('Marlin Bailey', 256, 100);

//     context.font = 'bold 60px Arial, sans-serif';
//     context.fillText('POLO TEAM', 256, 180);

//     const textTexture = new THREE.CanvasTexture(canvas);
//     const textMaterial = new THREE.MeshStandardMaterial({
//       map: textTexture,
//       transparent: true,
//       roughness: 0.8,
//     });

//     const textGeometry = new THREE.PlaneGeometry(1.8, 0.9);
//     const textMesh = new THREE.Mesh(textGeometry, textMaterial);
//     textMesh.position.set(0, 0, 0.16);
//     group.add(textMesh);

//     // Add subtle pattern overlay
//     const patternGeometry = new THREE.PlaneGeometry(2.2, 2.8);
//     const patternCanvas = document.createElement('canvas');
//     const patternContext = patternCanvas.getContext('2d');
//     patternCanvas.width = 256;
//     patternCanvas.height = 256;

//     patternContext.fillStyle = 'rgba(0, 0, 0, 0.02)';
//     for (let i = 0; i < 256; i += 8) {
//       for (let j = 0; j < 256; j += 8) {
//         if ((i + j) % 16 === 0) {
//           patternContext.fillRect(i, j, 4, 4);
//         }
//       }
//     }

//     const patternTexture = new THREE.CanvasTexture(patternCanvas);
//     const patternMaterial = new THREE.MeshStandardMaterial({
//       map: patternTexture,
//       transparent: true,
//       opacity: 0.3,
//       roughness: 0.9,
//     });

//     const pattern = new THREE.Mesh(patternGeometry, patternMaterial);
//     pattern.position.set(0, 0, 0.17);
//     group.add(pattern);

//     scene.add(group);
//     setIsLoading(false);

//     // Mouse interaction
//     let isDragging = false;
//     let previousMousePosition = { x: 0, y: 0 };
//     let rotation = { x: 0, y: 0 };

//     const onMouseDown = (e) => {
//       isDragging = true;
//       previousMousePosition = {
//         x: e.clientX,
//         y: e.clientY,
//       };
//     };

//     const onMouseMove = (e) => {
//       if (isDragging) {
//         const deltaMove = {
//           x: e.clientX - previousMousePosition.x,
//           y: e.clientY - previousMousePosition.y,
//         };

//         rotation.y += deltaMove.x * 0.01;
//         rotation.x += deltaMove.y * 0.01;

//         // Limit vertical rotation
//         rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, rotation.x));

//         previousMousePosition = {
//           x: e.clientX,
//           y: e.clientY,
//         };
//       }
//     };

//     const onMouseUp = () => {
//       isDragging = false;
//     };

//     // Touch events for mobile
//     const onTouchStart = (e) => {
//       isDragging = true;
//       previousMousePosition = {
//         x: e.touches[0].clientX,
//         y: e.touches[0].clientY,
//       };
//     };

//     const onTouchMove = (e) => {
//       if (isDragging) {
//         const deltaMove = {
//           x: e.touches[0].clientX - previousMousePosition.x,
//           y: e.touches[0].clientY - previousMousePosition.y,
//         };

//         rotation.y += deltaMove.x * 0.01;
//         rotation.x += deltaMove.y * 0.01;

//         rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, rotation.x));

//         previousMousePosition = {
//           x: e.touches[0].clientX,
//           y: e.touches[0].clientY,
//         };
//       }
//     };

//     const onTouchEnd = () => {
//       isDragging = false;
//     };

//     renderer.domElement.addEventListener('mousedown', onMouseDown);
//     renderer.domElement.addEventListener('mousemove', onMouseMove);
//     renderer.domElement.addEventListener('mouseup', onMouseUp);
//     renderer.domElement.addEventListener('touchstart', onTouchStart);
//     renderer.domElement.addEventListener('touchmove', onTouchMove);
//     renderer.domElement.addEventListener('touchend', onTouchEnd);

//     // Animation loop
//     const animate = () => {
//       requestAnimationFrame(animate);

//       // Smooth rotation
//       group.rotation.y += (rotation.y - group.rotation.y) * 0.1;
//       group.rotation.x += (rotation.x - group.rotation.x) * 0.1;

//       // Auto-rotate when not dragging
//       if (!isDragging) {
//         rotation.y += 0.003;
//       }

//       renderer.render(scene, camera);
//     };
//     animate();

//     // Handle resize
//     const handleResize = () => {
//       if (!mountRef.current) return;
//       const width = mountRef.current.clientWidth;
//       const height = mountRef.current.clientHeight;

//       camera.aspect = width / height;
//       camera.updateProjectionMatrix();
//       renderer.setSize(width, height);
//     };
//     window.addEventListener('resize', handleResize);

//     // Cleanup
//     return () => {
//       window.removeEventListener('resize', handleResize);
//       renderer.domElement.removeEventListener('mousedown', onMouseDown);
//       renderer.domElement.removeEventListener('mousemove', onMouseMove);
//       renderer.domElement.removeEventListener('mouseup', onMouseUp);
//       renderer.domElement.removeEventListener('touchstart', onTouchStart);
//       renderer.domElement.removeEventListener('touchmove', onTouchMove);
//       renderer.domElement.removeEventListener('touchend', onTouchEnd);

//       if (mountRef.current) {
//         mountRef.current.removeChild(renderer.domElement);
//       }

//       // Dispose of Three.js resources
//       scene.traverse((object) => {
//         if (object.geometry) object.geometry.dispose();
//         if (object.material) {
//           if (Array.isArray(object.material)) {
//             object.material.forEach(material => material.dispose());
//           } else {
//             object.material.dispose();
//           }
//         }
//       });
//       renderer.dispose();
//     };
//   }, []);

//   return (
//     <ProductSection>
//       <ContentWrapper>
//         <SectionLabel>The SILHOUETTE</SectionLabel>
//         <ProductTitle>Premium Cotton Polo with Pattern</ProductTitle>
//         <ProductSubtitle>Express your own style with just one click</ProductSubtitle>

//         <Canvas3D ref={mountRef}>
//           {isLoading && (
//             <Box
//               sx={{
//                 position: 'absolute',
//                 top: '50%',
//                 left: '50%',
//                 transform: 'translate(-50%, -50%)',
//                 color: '#999',
//               }}
//             >
//               Loading 3D Model...
//             </Box>
//           )}
//         </Canvas3D>

//         <InstructionText>
//           Drag to rotate • Scroll to zoom • Experience every angle
//         </InstructionText>
//       </ContentWrapper>
//     </ProductSection>
//   );
// };

// export default PremiumPoloViewer;
