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
  private activeStreamSubscriptions: { [receiverId: number]: { unsubscribe: () => void } | null } = {};

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

        // Intentar streaming SSE primero
        try {
          this.stopStreaming(chat.receiver);
          const user = this.users.find(u => u.id === chat.receiver);
          if (user) { user.typing = true; }
          const assistantMsg = { sender: chat.receiver, time: today.toLowerCase(), text: '' };
          this.chat.filter(chats => {
            if (chats.id == chat.receiver) {
              chats.message.push(assistantMsg);
            }
          });

          const sub = this.kai.streamProductRetriver(chat.message).subscribe({
            next: (chunk: string) => {
              assistantMsg.text += chunk;
              document.querySelector(".chat-history")?.scrollBy({ top: 150, behavior: 'smooth' });
            },
            error: (_err) => {
              // Fallback a llamada normal si el stream falla
              this.invokeOnceFallback(chat, assistantMsg, user);
            },
            complete: () => {
              if (user) { user.typing = false; }
              this.activeStreamSubscriptions[chat.receiver] = null;
            }
          });
          this.activeStreamSubscriptions[chat.receiver] = sub as any;
        } catch (_e) {
          // Fallback si falla
          const user = this.users.find(u => u.id === chat.receiver);
          const assistantMsg = { sender: chat.receiver, time: today.toLowerCase(), text: '' };
          this.invokeOnceFallback(chat, assistantMsg, user);
        }
      }
    })
  }

  public stopStreaming(receiverId: number): void {
    const interval = this.activeStreams[receiverId];
    if (interval) {
      clearInterval(interval);
      delete this.activeStreams[receiverId];
    }
    const sub = this.activeStreamSubscriptions[receiverId];
    if (sub) {
      try { sub.unsubscribe(); } catch {}
      this.activeStreamSubscriptions[receiverId] = null;
    }
    const user = this.users.find(u => u.id === receiverId);
    if (user) { user.typing = false; }
  }

  private invokeOnceFallback(chat, assistantMsg, user?: any) {
    this.kai.invokeKatuqAdvandceIntelligenceForProductRetriver(chat.message).subscribe(response => {
      if (response) {
        this.chat.filter(chats => {
          if (chats.id == chat.receiver) {
            setTimeout(() => {
              assistantMsg.text = (response.result || '').toString();
              if (user) { user.typing = false; }
              document.querySelector(".chat-history")?.scrollBy({ top: 250, behavior: 'smooth' });
            }, 300);
          }
        })
      }
    });
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
