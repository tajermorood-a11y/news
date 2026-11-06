import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from './src/supabase';
import { styles, C } from './src/theme';

const TABS = ['Matches', 'My picks', 'Leaderboard', 'Friends', 'Profile'];
const arDate = (value) => value ? new Date(value).toLocaleString() : '';

function Button({ title, onPress, secondary=false, disabled=false }) {
  return <TouchableOpacity disabled={disabled} onPress={onPress} style={[styles.button, secondary && styles.buttonSecondary, disabled && {opacity:.5}]}><Text style={[styles.buttonText, secondary && {color:C.green}]}>{title}</Text></TouchableOpacity>;
}
function Field(props) { return <TextInput placeholderTextColor={C.muted} style={styles.input} {...props}/>; }
function Header({title, subtitle}) { return <View style={styles.header}><Text style={styles.brand}>MATCHDAY</Text><Text style={styles.heading}>{title}</Text>{!!subtitle && <Text style={styles.muted}>{subtitle}</Text>}</View>; }

function AuthScreen() {
  const [mode,setMode] = useState('signin');
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [name,setName] = useState('');
  const [busy,setBusy] = useState(false);
  const submit = async () => {
    if (!email.trim() || !password) return Alert.alert('Missing details','Enter your email and password.');
    setBusy(true);
    const result = mode === 'signin'
      ? await supabase.auth.signInWithPassword({email:email.trim(),password})
      : await supabase.auth.signUp({email:email.trim(),password,options:{data:{full_name:name.trim()}}});
    setBusy(false);
    if (result.error) Alert.alert('Authentication error',result.error.message);
    else if (mode === 'signup' && !result.data.session) Alert.alert('Check your email','Confirm your email address to finish creating your account.');
  };
  return <SafeAreaView style={styles.screen}><KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={styles.center}><View style={styles.authCard}><Text style={styles.brand}>MATCHDAY</Text><Text style={styles.heading}>{mode==='signin'?'Welcome back':'Create account'}</Text><Text style={styles.muted}>Football predictions. Compete with friends.</Text>
    {mode==='signup' && <Field placeholder="Full name" value={name} onChangeText={setName} autoCapitalize="words"/>}
    <Field placeholder="Email address" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"/>
    <Field placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry/>
    <Button title={busy?'Please wait…':mode==='signin'?'Sign in':'Create account'} onPress={submit} disabled={busy}/>
    <TouchableOpacity onPress={()=>setMode(mode==='signin'?'signup':'signin')}><Text style={styles.link}>{mode==='signin'?'New here? Create an account':'Already registered? Sign in'}</Text></TouchableOpacity>
  </View></KeyboardAvoidingView></SafeAreaView>;
}

function MatchCard({match,onSelect}) {
  const home=match.home_team?.name || 'Home';
  const away=match.away_team?.name || 'Away';
  return <TouchableOpacity style={styles.card} onPress={()=>onSelect(match)}>
    <View style={styles.rowBetween}><Text style={styles.eyebrow}>{match.competitions?.name || 'Football'}</Text><Text style={styles.eyebrow}>{match.status?.toUpperCase()}</Text></View>
    <Text style={styles.matchTeams}>{home}  <Text style={{color:C.green}}>vs</Text>  {away}</Text>
    <Text style={styles.muted}>{arDate(match.start_time)}</Text>
    {match.status==='finished' && <Text style={styles.score}>{match.home_score} - {match.away_score}</Text>}
    <Text style={styles.link}>View markets →</Text>
  </TouchableOpacity>;
}
function MatchDetail({match,onBack}) {
  const [markets,setMarkets]=useState([]);
  const [selected,setSelected]=useState(null);
  const [loading,setLoading]=useState(true);
  const [sending,setSending]=useState(false);
  useEffect(()=>{(async()=>{
    const {data,error}=await supabase.from('markets').select('id,market_type,status,closes_at,market_outcomes(id,outcome_code,label,odds,is_active)').eq('match_id',match.id).eq('status','open').order('created_at');
    if(error) Alert.alert('Could not load markets',error.message);
    setMarkets(data||[]);setLoading(false);
  })();},[match.id]);
  const place=async()=>{
    if(!selected) return;
    setSending(true);
    const {error}=await supabase.rpc('place_prediction',{p_outcome_id:selected.id,p_expected_odds:selected.odds});
    setSending(false);
    if(error) Alert.alert('Prediction not placed',error.message);
    else {Alert.alert('Prediction saved','Your pick has been recorded.');onBack();}
  };
  return <View style={{flex:1}}>
    <TouchableOpacity onPress={onBack}><Text style={styles.link}>← Back to matches</Text></TouchableOpacity>
    <Text style={styles.heading}>{match.home_team?.name} vs {match.away_team?.name}</Text>
    <Text style={styles.muted}>{arDate(match.start_time)}</Text>
    {loading?<ActivityIndicator color={C.green}/>:<ScrollView>
      {markets.map(m=><View key={m.id} style={styles.card}><Text style={styles.sectionTitle}>{m.market_type.replaceAll('_',' ').toUpperCase()}</Text>
        {(m.market_outcomes||[]).filter(o=>o.is_active).map(o=><TouchableOpacity key={o.id} onPress={()=>setSelected({...o,market_id:m.id})} style={[styles.outcome,selected?.id===o.id&&styles.outcomeSelected]}><Text style={styles.body}>{o.label}</Text><Text style={styles.odds}>{Number(o.odds).toFixed(2)}</Text></TouchableOpacity>)}
      </View>)}
      {!markets.length&&<Text style={styles.muted}>No open markets available for this match.</Text>}
    </ScrollView>}
    {!!selected&&<Button title={sending?'Submitting…':`Confirm pick · ${selected.label} @ ${selected.odds}`} onPress={place} disabled={sending}/>}
  </View>;
}

function MainApp({session}) {
  const [tab,setTab]=useState('Matches');
  const [matches,setMatches]=useState([]);
  const [picks,setPicks]=useState([]);
  const [leaders,setLeaders]=useState([]);
  const [friends,setFriends]=useState([]);
  const [selected,setSelected]=useState(null);
  const [loading,setLoading]=useState(false);
  const [refresh,setRefresh]=useState(0);
  const load=async()=>{
    setLoading(true);
    if(tab==='Matches'){
      const {data,error}=await supabase.from('matches').select('id,start_time,status,home_score,away_score,competitions(name),home_team:teams!matches_home_team_id_fkey(name),away_team:teams!matches_away_team_id_fkey(name)').in('status',['scheduled','live']).order('start_time',{ascending:true}).limit(60);
      if(error) Alert.alert('Matches',error.message); setMatches(data||[]);
    } else if(tab==='My picks'){
      const {data,error}=await supabase.from('predictions').select('id,status,odds_snapshot,points_awarded,created_at,market_outcomes(label),matches(start_time,home_team:teams!matches_home_team_id_fkey(name),away_team:teams!matches_away_team_id_fkey(name))').eq('user_id',session.user.id).order('created_at',{ascending:false}).limit(100);
      if(error) Alert.alert('My picks',error.message);setPicks(data||[]);
    } else if(tab==='Leaderboard'){
      const {data,error}=await supabase.rpc('get_leaderboard',{p_period:'all_time',p_limit:50});
      if(error) Alert.alert('Leaderboard',error.message);setLeaders(data||[]);
    } else if(tab==='Friends'){
      const {data,error}=await supabase.rpc('get_friends',{});
      if(error) Alert.alert('Friends',error.message);setFriends(data||[]);
    }
    setLoading(false);
  };
  useEffect(()=>{load();},[tab,refresh]);
  const signOut=async()=>{await supabase.auth.signOut();};
  return <SafeAreaView style={styles.screen}>
    <View style={styles.topbar}><Text style={styles.brand}>MATCHDAY</Text><TouchableOpacity onPress={()=>setRefresh(x=>x+1)}><Text style={styles.link}>Refresh ↻</Text></TouchableOpacity></View>
    <View style={styles.content}>
      {selected?<MatchDetail match={selected} onBack={()=>{setSelected(null);setRefresh(x=>x+1);}}/>:
      <ScrollView contentContainerStyle={{paddingBottom:24}}>
        <Header title={tab} subtitle={tab==='Matches'?'Choose a match and predict the outcome.':undefined}/>
        {loading?<ActivityIndicator color={C.green} style={{marginTop:30}}/>:
          tab==='Matches'?matches.map(m=><MatchCard key={m.id} match={m} onSelect={setSelected}/>)
          :tab==='My picks'?picks.map(p=><View key={p.id} style={styles.card}><Text style={styles.sectionTitle}>{p.matches?.home_team?.name} vs {p.matches?.away_team?.name}</Text><Text style={styles.body}>{p.market_outcomes?.label} · odds {p.odds_snapshot}</Text><View style={styles.rowBetween}><Text style={styles.muted}>{p.status.toUpperCase()}</Text><Text style={styles.odds}>{p.points_awarded} pts</Text></View></View>)
          :tab==='Leaderboard'?leaders.map((l,i)=><View key={l.user_id||i} style={styles.listRow}><Text style={styles.rank}>{i+1}</Text><View style={{flex:1}}><Text style={styles.body}>{l.full_name||l.name||'Player'}</Text><Text style={styles.muted}>{l.total_predictions||0} predictions</Text></View><Text style={styles.odds}>{l.total_points||0} pts</Text></View>)
          :tab==='Friends'?friends.map((f,i)=><View key={f.user_id||f.id||i} style={styles.listRow}><Text style={styles.avatar}>{(f.full_name||f.name||'F').slice(0,1).toUpperCase()}</Text><Text style={[styles.body,{flex:1}]}>{f.full_name||f.name||'Friend'}</Text></View>)
          :<View style={styles.card}><Text style={styles.sectionTitle}>Account</Text><Text style={styles.body}>{session.user.email}</Text><Text style={styles.muted}>Signed in securely with Supabase Auth.</Text><Button title="Sign out" secondary onPress={signOut}/></View>}
        {!loading && tab!=='Profile' && !(tab==='Matches'?matches:tab==='My picks'?picks:tab==='Leaderboard'?leaders:friends).length&&<Text style={styles.muted}>Nothing to show yet.</Text>}
      </ScrollView>}
    </View>
    <View style={styles.tabbar}>{TABS.map(t=><TouchableOpacity key={t} onPress={()=>{setSelected(null);setTab(t);}} style={styles.tab}><Text style={[styles.tabText,tab===t&&styles.tabActive]}>{t==='Matches'?'⚽':t==='My picks'?'✓':t==='Leaderboard'?'🏆':t==='Friends'?'♧':'☺'}</Text><Text style={[styles.tabLabel,tab===t&&styles.tabLabelActive]}>{t}</Text></TouchableOpacity>)}</View>
  </SafeAreaView>;
}

export default function App(){
  const [session,setSession]=useState(null);
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setReady(true);});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>setSession(s));
    return ()=>subscription.unsubscribe();
  },[]);
  if(!ready)return <View style={styles.loading}><ActivityIndicator size="large" color={C.green}/></View>;
  return <><StatusBar barStyle="dark-content"/>{session?<MainApp session={session}/>:<AuthScreen/>}</>;
}
