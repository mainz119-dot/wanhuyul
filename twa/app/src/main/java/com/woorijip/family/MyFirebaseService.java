package com.woorijip.family;
import android.app.*;import android.content.*;import android.os.Build;import androidx.core.app.NotificationCompat;import com.google.firebase.messaging.FirebaseMessagingService;import com.google.firebase.messaging.RemoteMessage;import org.json.JSONObject;
public class MyFirebaseService extends FirebaseMessagingService{
  // v1-twa: TWA 프로젝트로 이식. 기존 v22-push-fix 로직 그대로 재사용.
  static final String CH="woorijip_push";
  @Override public void onNewToken(String t){super.onNewToken(t);getSharedPreferences("woorijip_native",0).edit().putString("fcm_token",t).apply();}
  @Override public void onMessageReceived(RemoteMessage m){
    super.onMessageReceived(m);
    String title="완후율",body="새 메시지가 있어요",type="chat",from="";
    if(m.getNotification()!=null){if(m.getNotification().getTitle()!=null)title=m.getNotification().getTitle();if(m.getNotification().getBody()!=null)body=m.getNotification().getBody();}
    if(!m.getData().isEmpty()){if(m.getData().containsKey("title"))title=m.getData().get("title");if(m.getData().containsKey("body"))body=m.getData().get("body");if(m.getData().containsKey("type"))type=m.getData().get("type");if(m.getData().containsKey("sender_name"))from=m.getData().get("sender_name");}
    NotificationManager nm=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);
    if(Build.VERSION.SDK_INT>=26)nm.createNotificationChannel(new NotificationChannel(CH,"완후율 알림",NotificationManager.IMPORTANCE_HIGH));
    // 알림 탭 시 TWA(웹앱)를 그대로 연다. LauncherActivity가 항상 최신 웹앱 화면을 로드하므로
    // 별도 딥링크 라우팅 없이도 앱 안에서 메시지를 확인할 수 있다.
    Intent i=new Intent(this,LauncherActivity.class);i.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_NEW_TASK);
    PendingIntent pi=PendingIntent.getActivity(this,(int)(System.currentTimeMillis()&0x7fffffff),i,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    NotificationCompat.Builder b=new NotificationCompat.Builder(this,CH).setSmallIcon(android.R.drawable.ic_dialog_info).setContentTitle(title).setContentText(body).setStyle(new NotificationCompat.BigTextStyle().bigText(body)).setPriority(NotificationCompat.PRIORITY_HIGH).setCategory(type.equals("video")?NotificationCompat.CATEGORY_CALL:NotificationCompat.CATEGORY_MESSAGE).setAutoCancel(true).setContentIntent(pi);
    nm.notify((int)(System.currentTimeMillis()&0x7fffffff),b.build());
  }
}
