package com.woorijip.family;

import android.Manifest;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.*;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

// v1: TWA는 JS<->네이티브 브릿지가 없어서, 위치 공유 on/off는 이 독립된 네이티브 화면에서
// 처리한다. 여기서 SharedPreferences(woorijip_native)에 user_name / location_enabled를
// 직접 쓰고, NativeLocationService(포그라운드 서비스)를 직접 start/stop한다.
// 이 서비스는 SharedPreferences만 보고 동작하므로 TWA(웹) 쪽과는 완전히 독립적이다.
public class LocationActivity extends AppCompatActivity {

  static final String PREF = "woorijip_native";
  static final String[] FAMILY = {"아빠", "엄마", "와니", "후야", "니보"};

  Spinner spinner;
  Switch toggle;
  TextView statusText;

  @Override
  protected void onCreate(Bundle b) {
    super.onCreate(b);

    SharedPreferences prefs = getSharedPreferences(PREF, 0);

    LinearLayout root = new LinearLayout(this);
    root.setOrientation(LinearLayout.VERTICAL);
    int pad = dp(24);
    root.setPadding(pad, pad, pad, pad);

    TextView title = new TextView(this);
    title.setText("완후율 위치 공유 설정");
    title.setTextSize(20);
    title.setPadding(0, 0, 0, dp(24));
    root.addView(title);

    TextView label1 = new TextView(this);
    label1.setText("나는 누구인가요?");
    root.addView(label1);

    spinner = new Spinner(this);
    ArrayAdapter<String> adapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, FAMILY);
    spinner.setAdapter(adapter);
    String savedUser = prefs.getString("user_name", "");
    for (int i = 0; i < FAMILY.length; i++) if (FAMILY[i].equals(savedUser)) spinner.setSelection(i);
    root.addView(spinner);

    LinearLayout row = new LinearLayout(this);
    row.setOrientation(LinearLayout.HORIZONTAL);
    row.setGravity(Gravity.CENTER_VERTICAL);
    row.setPadding(0, dp(32), 0, 0);
    TextView label2 = new TextView(this);
    label2.setText("위치 공유");
    label2.setTextSize(16);
    LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
    row.addView(label2, lp);
    toggle = new Switch(this);
    toggle.setChecked(prefs.getBoolean("location_enabled", false));
    row.addView(toggle);
    root.addView(row);

    statusText = new TextView(this);
    statusText.setPadding(0, dp(16), 0, dp(16));
    statusText.setTextColor(0xFF888888);
    root.addView(statusText);

    Button saveBtn = new Button(this);
    saveBtn.setText("저장");
    saveBtn.setOnClickListener(v -> onSave());
    root.addView(saveBtn);

    setContentView(root);
    refreshStatus();
  }

  void refreshStatus() {
    SharedPreferences prefs = getSharedPreferences(PREF, 0);
    boolean enabled = prefs.getBoolean("location_enabled", false);
    String user = prefs.getString("user_name", "");
    if (enabled && !user.isEmpty()) {
      statusText.setText("현재 상태: " + user + "님으로 위치 공유 중");
    } else {
      statusText.setText("현재 상태: 공유 안 함");
    }
  }

  void onSave() {
    String user = (String) spinner.getSelectedItem();
    boolean enabled = toggle.isChecked();
    SharedPreferences prefs = getSharedPreferences(PREF, 0);
    prefs.edit().putString("user_name", user).putBoolean("location_enabled", enabled).apply();

    if (enabled) {
      if (hasLocationPermission()) {
        startLocationService();
      } else {
        requestLocationPermission();
        return; // 권한 콜백에서 이어서 처리
      }
    } else {
      stopService(new Intent(this, NativeLocationService.class));
      Toast.makeText(this, "위치 공유를 껐어요.", Toast.LENGTH_SHORT).show();
    }
    refreshStatus();
  }

  boolean hasLocationPermission() {
    boolean fine = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    if (!fine) return false;
    if (Build.VERSION.SDK_INT >= 29) {
      return ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }
    return true;
  }

  void requestLocationPermission() {
    // 1단계: 정확한 위치 권한부터. Android는 "항상 허용"(백그라운드)을 이 단계에서
    // 같이 물어보면 거부하는 경우가 많아서, 먼저 foreground 권한을 받고 별도로 재요청한다.
    ActivityCompat.requestPermissions(this,
        new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, 1001);
    if (Build.VERSION.SDK_INT >= 33) {
      ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1003);
    }
  }

  @Override
  public void onRequestPermissionsResult(int code, @NonNull String[] perms, @NonNull int[] results) {
    super.onRequestPermissionsResult(code, perms, results);
    if (code == 1001) {
      boolean granted = results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED;
      if (granted && Build.VERSION.SDK_INT >= 29 && !hasLocationPermission()) {
        // 2단계: "항상 허용"(백그라운드 위치)은 별도 다이얼로그로 재요청해야 한다.
        Toast.makeText(this, "다음 화면에서 '항상 허용'을 선택해주세요.", Toast.LENGTH_LONG).show();
        ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.ACCESS_BACKGROUND_LOCATION}, 1002);
      } else if (granted) {
        startLocationService();
        refreshStatus();
      } else {
        Toast.makeText(this, "위치 권한이 없으면 공유할 수 없어요.", Toast.LENGTH_LONG).show();
        toggle.setChecked(false);
      }
    } else if (code == 1002) {
      boolean granted = results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED;
      if (granted) {
        startLocationService();
      } else {
        Toast.makeText(this, "'항상 허용'을 선택해야 앱을 꺼도 위치가 공유돼요.", Toast.LENGTH_LONG).show();
      }
      refreshStatus();
    }
  }

  void startLocationService() {
    Intent i = new Intent(this, NativeLocationService.class);
    if (Build.VERSION.SDK_INT >= 26) startForegroundService(i); else startService(i);
    Toast.makeText(this, "위치 공유를 시작했어요.", Toast.LENGTH_SHORT).show();
  }

  int dp(int v) {
    return (int) (v * getResources().getDisplayMetrics().density);
  }
}
