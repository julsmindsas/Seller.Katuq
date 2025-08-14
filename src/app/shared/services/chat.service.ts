import { Injectable } from '@angular/core';
import { Observable, Subscriber } from 'rxjs';
import { map } from 'rxjs/operators';
import { ChatDB } from '../../shared/data/chat';
import { chat, ChatUsers } from '../models/chat/chat.model';
import { KatuqintelligenceService } from './katuqintelligence/katuqintelligence.service';

var today = new Date().toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  public observer: Subscriber<{}>;
  public chat: any[] = []
  public users: any[] = []
  private activeStreams: { [receiverId: number]: any } = {};

  constructor(private kai: KatuqintelligenceService) {
    this.chat = ChatDB.chat
    this.users = ChatDB.chatUser
  }

  // Get User Data
  public getUsers(): Observable<ChatUsers[]> {
    const users = new Observable(observer => {
      observer.next(this.users);
      observer.complete();
    });
    return <Observable<ChatUsers[]>>users;
  }

  // Get cuurent user
  public getCurrentUser() {
    return this.getUsers().pipe(map(users => {
      return users.find((item) => {
        return item.authenticate === 0;
      });
    }));
  }

  // chat to user
  public chatToUser(id: number) {
    return this.getUsers().pipe(map(users => {
      return users.find((item) => {
        return item.id === id;
      });
    }));
  }

  // Get users chat
  public getUserChat(): Observable<chat[]> {
    const chat = new Observable(observer => {
      observer.next(this.chat);
      observer.complete();
    });
    return <Observable<chat[]>>chat;
  }

  // Get chat History
  public getChatHistory(id: number) {
    return this.getUserChat().pipe(map(users => {
      return users.find((item) => {
        return item.id === id;
      });
    }));
  }

  // Send Message to user
  public sendMessage(chat) {
    this.chat.filter(chats => {
      if (chats.id == chat.receiver) {
        chats.message.push({ sender: chat.sender, time: today.toLowerCase(), text: chat.message });
        setTimeout(function () {
          const chatHistory = document.querySelector(".chat-history");
          if (chatHistory) {
            chatHistory.scrollBy({ top: 200, behavior: 'smooth' });
          }
        }, 310)
        // this.responseMessage(chat)

        this.kai.invokeKatuqAdvandceIntelligenceForProductRetriver(chat.message).subscribe(response => {
          console.log(response)
          if (response) {
            this.chat.filter(chats => {
              if (chats.id == chat.receiver) {
                const user = this.users.find(u => u.id === chat.receiver);
                if (user) { user.typing = true; }
                // Insertar mensaje vacío y hacer streaming del resultado
                const assistantMsg = { sender: chat.receiver, time: today.toLowerCase(), text: '' };
                chats.message.push(assistantMsg);
                const full = (response.result || '').toString();
                let idx = 0;
                const step = Math.max(1, Math.floor(full.length / 120)); // ~120 pasos
                // Detener cualquier stream previo
                this.stopStreaming(chat.receiver);
                const interval = setInterval(() => {
                  // Si se detuvo externamente
                  if (!this.activeStreams[chat.receiver]) {
                    clearInterval(interval);
                    return;
                  }
                  const next = full.slice(idx, idx + step);
                  assistantMsg.text += next;
                  idx += step;
                  document.querySelector(".chat-history")?.scrollBy({ top: 150, behavior: 'smooth' });
                  if (idx >= full.length) {
                    clearInterval(interval);
                    delete this.activeStreams[chat.receiver];
                    if (user) { user.typing = false; }
                  }
                }, 25);
                this.activeStreams[chat.receiver] = interval;
              }
            })
          }
        });
      }
    })
  }

  public stopStreaming(receiverId: number): void {
    const interval = this.activeStreams[receiverId];
    if (interval) {
      clearInterval(interval);
      delete this.activeStreams[receiverId];
    }
    const user = this.users.find(u => u.id === receiverId);
    if (user) { user.typing = false; }
  }

  public responseMessage(chat) {

    this.chat.filter(chats => {
      if (chats.id == chat.receiver) {
        setTimeout(() => {
          chats.message.push({ sender: chat.receiver, time: today.toLowerCase(), text: 'Hey This is ' + chat.receiver_name + ', Sorry I busy right now, I will text you later' })
        }, 2000);
        setTimeout(function () {
          document.querySelector(".chat-history")?.scrollBy({ top: 200, behavior: 'smooth' });
        }, 2310)
      }
    })
  }

}
