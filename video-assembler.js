// Client-Side Video Assembly
// Combines multiple video scenes into a single final video with transitions

class VideoAssembler {
    constructor() {
        this.config = {
            width: 1280,
            height: 720,
            fps: 24,
            titleDuration: 3000, // ms
            fadeDuration: 600 // ms
        };
    }

    /**
     * Create title screen as video blob
     */
    async createTitleScreen(title, duration = 3000) {
        const canvas = document.createElement('canvas');
        canvas.width = this.config.width;
        canvas.height = this.config.height;
        const ctx = canvas.getContext('2d');

        // Dark background
        ctx.fillStyle = '#0b1220';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Title text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Wrap long titles
        const lines = this.wrapText(ctx, title, canvas.width - 100);
        const lineHeight = 60;
        const startY = (canvas.height - (lines.length * lineHeight)) / 2;
        
        lines.forEach((line, i) => {
            ctx.fillText(line, canvas.width / 2, startY + (i * lineHeight));
        });

        // Convert canvas to video blob
        return await this.canvasToVideoBlob(canvas, duration);
    }

    /**
     * Wrap text to fit canvas width
     */
    wrapText(ctx, text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        words.forEach(word => {
            const testLine = currentLine + word + ' ';
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && currentLine.length > 0) {
                lines.push(currentLine.trim());
                currentLine = word + ' ';
            } else {
                currentLine = testLine;
            }
        });
        
        if (currentLine.length > 0) {
            lines.push(currentLine.trim());
        }
        
        return lines;
    }

    /**
     * Convert canvas to video blob (simplified - requires browser support)
     */
    async canvasToVideoBlob(canvas, duration) {
        // Note: This requires MediaRecorder API
        // In practice, for production use FFmpeg.wasm or server-side processing
        
        const stream = canvas.captureStream(this.config.fps);
        const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9',
            videoBitsPerSecond: 2500000
        });

        const chunks = [];
        
        return new Promise((resolve, reject) => {
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunks.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                resolve(blob);
            };

            mediaRecorder.onerror = (e) => reject(e);

            mediaRecorder.start();
            setTimeout(() => mediaRecorder.stop(), duration);
        });
    }

    /**
     * Download video blob
     */
    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Merge multiple videos (simplified approach)
     * For production: use FFmpeg.wasm or server-side processing
     */
    async mergeVideos(videoUrls, story) {
        console.log('🎬 Starting video assembly...');
        console.log('Videos to merge:', videoUrls.length);

        // For now, return instructions for manual merge
        // In production, use FFmpeg.wasm
        return {
            success: false,
            message: 'Client-side video merging requires FFmpeg.wasm',
            recommendation: 'Use Python assembly script or video editing software',
            pythonScript: 'assemble_flow_style.py',
            scenes: videoUrls.map((url, i) => ({
                scene: i + 1,
                url: url,
                instruction: `Download and place in output/v2/motion/ as scene_${String(i + 1).padStart(2, '0')}.mp4`
            }))
        };
    }

    /**
     * Generate assembly instructions
     */
    generateAssemblyInstructions(story, scenes) {
        const instructions = {
            title: story.title || 'Untitled Story',
            totalScenes: scenes.length,
            steps: [
                '1. Download all scene videos',
                '2. Install Python 3 and FFmpeg',
                '3. Run: python3 assemble_flow_style.py',
                '4. Find final video in output/v2/'
            ],
            sceneDetails: scenes.map((scene, i) => ({
                id: scene.id || i + 1,
                videoUrl: scene.url,
                urduText: scene.urduText || '',
                filename: `scene_${String(scene.id || i + 1).padStart(2, '0')}.mp4`
            })),
            pythonCommand: 'python3 assemble_flow_style.py',
            outputPath: 'output/v2/mir_flow_style_1min.mp4'
        };

        return instructions;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VideoAssembler;
}
