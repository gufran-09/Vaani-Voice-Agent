import win32com.client

voice = win32com.client.Dispatch("SAPI.SpVoice")

phrases = {
    "phrase1_coffee_samosa": "One filter coffee and two samosas, parcel please.",
    "phrase2_chai_samosa": "One masala chai and two samosas, please.",
    "phrase3_correction": "Actually, make that three samosas.",
    "phrase4_hindi": "Ek masala dosa aur do chai.",
    "phrase5_telugu": "Rendu filter coffee, okati sugar lekunda."
}

fs = win32com.client.Dispatch("SAPI.SpFileStream")
for name, text in phrases.items():
    wav_path = f"scratch/{name}.wav"
    fs.Open(wav_path, 3, False)  # 3 = SSFMCreateForWrite
    voice.AudioOutputStream = fs
    voice.Speak(text)
    fs.Close()
    print(f"Generated {wav_path}: '{text}'")
