package tech.gorodot.muravey

import android.content.Intent
import android.graphics.*
import android.graphics.drawable.Drawable
import android.net.Uri
import android.os.Bundle
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream

class MainActivity : ComponentActivity() {
    private lateinit var web: WebView
    private var canBack = false
    private var launchedPkg: String? = null
    private var launchedAt = 0L

    private val pickImage = registerForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) Thread {
            val data = imageToDataUrl(uri)
            if (data != null) js("onImage(${JSONObject.quote(data)})")
        }.start()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        web = WebView(this)
        web.setBackgroundColor(Color.parseColor("#0e1117"))
        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true
        web.addJavascriptInterface(Bridge(), "Android")
        setContentView(web)
        web.loadUrl("file:///android_asset/index.html")
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() { if (canBack) js("onBack()") else finish() }
        })
    }

    override fun onResume() {
        super.onResume()
        val p = launchedPkg ?: return
        val sec = ((System.currentTimeMillis() - launchedAt) / 1000).toInt()
        launchedPkg = null
        js("onExit(${JSONObject.quote(p)},$sec)")
    }

    private fun js(code: String) = runOnUiThread { web.evaluateJavascript(code, null) }

    private fun drawableToDataUrl(d: Drawable, size: Int = 96): String {
        val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val c = Canvas(bmp); d.setBounds(0, 0, size, size); d.draw(c)
        val out = ByteArrayOutputStream(); bmp.compress(Bitmap.CompressFormat.PNG, 100, out)
        return "data:image/png;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
    }

    private fun imageToDataUrl(uri: Uri): String? = try {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
        var sample = 1
        while (bounds.outWidth / sample > 1024 || bounds.outHeight / sample > 1024) sample *= 2
        val src = contentResolver.openInputStream(uri)?.use {
            BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inSampleSize = sample })
        }!!
        val side = minOf(src.width, src.height)
        val sq = Bitmap.createBitmap(src, (src.width - side) / 2, (src.height - side) / 2, side, side)
        val scaled = Bitmap.createScaledBitmap(sq, 320, 320, true)
        val out = ByteArrayOutputStream(); scaled.compress(Bitmap.CompressFormat.JPEG, 85, out)
        "data:image/jpeg;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
    } catch (e: Exception) { null }

    inner class Bridge {
        private val prefs get() = getSharedPreferences("lib", 0)

        @JavascriptInterface fun load(): String = prefs.getString("games", "[]") ?: "[]"
        @JavascriptInterface fun save(json: String) { prefs.edit().putString("games", json).apply() }
        @JavascriptInterface fun setCanBack(b: Boolean) { canBack = b }
        @JavascriptInterface fun pickImage() { runOnUiThread { pickImage.launch("image/*") } }

        @JavascriptInterface fun loadApps() {
            Thread {
                val pm = packageManager
                val i = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
                val list = pm.queryIntentActivities(i, 0)
                    .filter { it.activityInfo.packageName != packageName }
                    .distinctBy { it.activityInfo.packageName }
                    .sortedBy { it.loadLabel(pm).toString().lowercase() }
                val arr = JSONArray()
                for (r in list) arr.put(JSONObject().apply {
                    put("pkg", r.activityInfo.packageName)
                    put("name", r.loadLabel(pm).toString())
                    put("icon", drawableToDataUrl(r.loadIcon(pm)))
                })
                js("onApps($arr)")
            }.start()
        }

        @JavascriptInterface fun launch(pkg: String, extras: String): String {
            val i = packageManager.getLaunchIntentForPackage(pkg) ?: return "Приложение не установлено: $pkg"
            extras.lines().forEach { line ->
                val p = line.split("=", limit = 2)
                if (p.size == 2 && p[0].isNotBlank()) i.putExtra(p[0].trim(), p[1].trim())
            }
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            launchedPkg = pkg; launchedAt = System.currentTimeMillis()
            return try { runOnUiThread { startActivity(i) }; "ok" } catch (e: Exception) { launchedPkg = null; e.message ?: "Ошибка запуска" }
        }
    }
}
