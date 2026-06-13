#!/bin/bash
echo "=== Fullscreen Functionality Diagnostic ==="
echo "Server: http://localhost:9119"
echo "Time: $(date)"
echo ""
echo "1. Checking if server is running..."
if curl -s http://localhost:9119/health > /dev/null; then
    echo "✅ Server is running"
else
    echo "❌ Server is NOT running"
    exit 1
fi

echo ""
echo "2. Checking JS file..."
JS_FILE=$(curl -s http://localhost:9119/ | grep -o 'index-[^"]*\.js' | head -1)
echo "   JS file being served: $JS_FILE"

echo ""
echo "3. Checking if JS file contains fullscreen functions..."
if curl -s http://localhost:9119/assets/$JS_FILE | grep -q "requestFullscreen\|exitFullscreen\|fullscreenElement"; then
    echo "✅ JS file contains fullscreen functions"
else
    echo "❌ JS file does NOT contain fullscreen functions"
fi

echo ""
echo "4. Checking file timestamps..."
BUILD_TIME=$(stat -c %y frontend/dist/assets/$JS_FILE 2>/dev/null || echo "File not found")
echo "   Build time: $BUILD_TIME"

echo ""
echo "5. Testing fullscreen API directly..."
cat > /tmp/test_fullscreen.html << 'EOF'
<!DOCTYPE html>
<html>
<body>
<script>
    const hasRequestFullscreen = typeof document.documentElement.requestFullscreen !== 'undefined';
    const hasExitFullscreen = typeof document.exitFullscreen !== 'undefined';
    const hasFullscreenElement = typeof document.fullscreenElement !== 'undefined';
    
    console.log('Fullscreen API available:', hasRequestFullscreen && hasExitFullscreen && hasFullscreenElement);
    console.log('- requestFullscreen:', hasRequestFullscreen);
    console.log('- exitFullscreen:', hasExitFullscreen);
    console.log('- fullscreenElement:', hasFullscreenElement);
    
    if (hasRequestFullscreen && hasExitFullscreen && hasFullscreenElement) {
        document.body.innerHTML = '<h1 style="color: green;">✅ Fullscreen API is available!</h1>';
    } else {
        document.body.innerHTML = '<h1 style="color: red;">❌ Fullscreen API is NOT available</h1>';
    }
</script>
</body>
</html>
EOF

echo ""
echo "=== Instructions for User ==="
echo "1. Open browser DevTools (F12)"
echo "2. Go to Network tab"
echo "3. Check 'Disable cache'"
echo "4. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)"
echo "5. Look for 'index-*.js' file in Network tab"
echo "6. Check Response headers for 'Cache-Control'"
echo ""
echo "=== Quick Test ==="
echo "Open this URL to test fullscreen API:"
echo "data:text/html;base64,PCFET0NUWVBFIGh0bWw+CjxodG1sPgo8Ym9keT4KPHNjcmlwdD4KICAgIGNvbnN0IGhhc1JlcXVlc3RGdWxsc2NyZWVuID0gdHlwZW9mIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5yZXF1ZXN0RnVsbHNjcmVlbiAhPT0gJ3VuZGVmaW5lZCc7CiAgICBjb25zdCBoYXNFeGl0RnVsbHNjcmVlbiA9IHR5cGVvZiBkb2N1bWVudC5leGl0RnVsbHNjcmVlbiAhPT0gJ3VuZGVmaW5lZCc7CiAgICBjb25zdCBoYXNGdWxsc2NyZWVuRWxlbWVudCA9IHR5cGVvZiBkb2N1bWVudC5mdWxsc2NyZWVuRWxlbWVudCAhPT0gJ3VuZGVmaW5lZCc7CiAgICAKICAgIGNvbnNvbGUubG9nKCdGdWxsc2NyZWVuIEFQSSBhdmFpbGFibGU6JywgaGFzUmVxdWVzdEZ1bGxzY3JlZW4gJiYgaGFzRXhpdEZ1bGxzY3JlZW4gJiYgaGFzRnVsbHNjcmVlbkVsZW1lbnQpOwogICAgY29uc29sZS5sb2coJy0gcmVxdWVzdEZ1bGxzY3JlZW46JywgaGFzUmVxdWVzdEZ1bGxzY3JlZW4pOwogICAgY29uc29sZS5sb2coJy0gZXhpdEZ1bGxzY3JlZW46JywgaGFzRXhpdEZ1bGxzY3JlZWuKICAgIGNvbnNvbGUubG9nKCctIGZ1bGxzY3JlZW5FbGVtZW50OicsIGhhc0Z1bGxzY3JlZW5FbGVtZW50KTsKICAgIAogICAgaWYgKGhhc1JlcXVlc3RGdWxsc2NyZWVuICYmIGhhc0V4aXRGdWxsc2NyZWVuICYmIGhhc0Z1bGxzY3JlZW5FbGVtZW50KSB7CiAgICAgICAgZG9jdW1lbnQuYm9keS5pbm5lckhUTUwgPSAnPGgxIHN0eWxlPSJjb2xvcjogZ3JlZW47Ij7inZMgRnVsbHNjcmVlbiBBUEkgaXMgYXZhaWxhYmxlITwvaDE+JzsKICAgIH0gZWxzZSB7CiAgICAgICAgZG9jdW1lbnQuYm9keS5pbm5lckhUTUwgPSAnPGgxIHN0eWxlPSJjb2xvcjogcmVkOyI+4p2MIFRoZSBGdWxsc2NyZWVuIEFQSSBpcyBOT1QgYXZhaWxhYmxlPC9oMT4nOwogICAgfQo8L3NjcmlwdD4KPC9ib2R5Pgo8L2h0bWw+Cg=="
echo ""
echo "=== If still not working ==="
echo "1. Try incognito/private window"
echo "2. Clear ALL browser data (cookies, cache, etc)"
echo "3. Try different browser"
echo "4. Check browser console for errors"
echo "5. Verify you're accessing the correct URL"