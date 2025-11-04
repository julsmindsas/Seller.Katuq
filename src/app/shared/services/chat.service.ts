import { Injectable } from '@angular/core';
import { Observable, Subscriber } from 'rxjs';
import { map } from 'rxjs/operators';
import { ChatDB } from '../../shared/data/chat';
import { chat, ChatUsers } from '../models/chat/chat.model';
import { KatuqintelligenceService } from './katuqintelligence/katuqintelligence.service';
import { AILimitsService } from './ai-limits.service';

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

  constructor(
    private kai: KatuqintelligenceService,
    private aiLimitsService: AILimitsService
  ) {
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
    // 1. Verificar límite antes de enviar
    this.aiLimitsService.checkAILimit('chat').subscribe(limitCheck => {
      if (!limitCheck.allowed) {
        // Límite alcanzado - mostrar mensaje de error en el chat
        this.chat.filter(chats => {
          if (chats.id == chat.receiver) {
            chats.message.push({
              sender: chat.sender,
              time: today.toLowerCase(),
              text: chat.message
            });

            // Mensaje de error del sistema
            chats.message.push({
              sender: chat.receiver,
              time: today.toLowerCase(),
              text: `⚠️ Has alcanzado el límite de ${limitCheck.limit} mensajes de chat IA por día. Actualiza a Premium para chat ilimitado.`
            });

            setTimeout(() => {
              document.querySelector(".chat-history")?.scrollBy({ top: 250, behavior: 'smooth' });
            }, 310);
          }
        });

        // Mostrar modal de upgrade
        this.aiLimitsService.showUpgradeModal(
          'chat',
          `Has alcanzado el límite de ${limitCheck.limit} mensajes de chat IA por día`
        );

        return;
      }

      // 2. Continuar con envío normal si el límite no se alcanzó
      this.chat.filter(chats => {
        if (chats.id == chat.receiver) {
          // Agregar mensaje del usuario
          chats.message.push({ sender: chat.sender, time: today.toLowerCase(), text: chat.message });
          setTimeout(function () {
            const chatHistory = document.querySelector(".chat-history");
            if (chatHistory) {
              chatHistory.scrollBy({ top: 200, behavior: 'smooth' });
            }
          }, 310)

          // Preparar usuario y mensaje asistente
          const user = this.users.find(u => u.id === chat.receiver);
          if (user) { user.typing = true; }

          // Crear mensaje del asistente (inicialmente vacío)
          const assistantMsg = { sender: chat.receiver, time: today.toLowerCase(), text: '' };
          let messageAddedToChat = false;

          // Intentar streaming SSE primero
          try {
            this.stopStreaming(chat.receiver);

          console.log('[ChatService] Intentando streaming para:', chat.message);

          const sub = this.kai.streamProductRetriver(chat.message).subscribe({
            next: (chunk: string) => {
              // Solo añadir mensaje al chat la primera vez que llega un chunk
              if (!messageAddedToChat) {
                this.chat.filter(c => {
                  if (c.id == chat.receiver) {
                    c.message.push(assistantMsg);
                  }
                });
                messageAddedToChat = true;
              }

              assistantMsg.text += chunk;
              document.querySelector(".chat-history")?.scrollBy({ top: 150, behavior: 'smooth' });
            },
            error: (err) => {
              console.warn('[ChatService] Streaming falló, usando fallback:', err);

              // Si ya se añadió mensaje vacío, eliminarlo
              if (messageAddedToChat) {
                this.chat.filter(c => {
                  if (c.id == chat.receiver) {
                    const idx = c.message.indexOf(assistantMsg);
                    if (idx > -1) {
                      c.message.splice(idx, 1);
                    }
                  }
                });
                messageAddedToChat = false;
              }

              // Usar fallback con mensaje nuevo
              const fallbackMsg = { sender: chat.receiver, time: today.toLowerCase(), text: '' };
              this.invokeOnceFallback(chat, fallbackMsg, user);
            },
            complete: () => {
              console.log('[ChatService] Streaming completado');
              if (user) { user.typing = false; }
              this.activeStreamSubscriptions[chat.receiver] = null;
            }
          });
          this.activeStreamSubscriptions[chat.receiver] = sub as any;
        } catch (e) {
          console.error('[ChatService] Error al iniciar streaming:', e);
          // Fallback si falla al iniciar
          const fallbackMsg = { sender: chat.receiver, time: today.toLowerCase(), text: '' };
          this.invokeOnceFallback(chat, fallbackMsg, user);
        }
      }
    });
    }); // Cerrar el subscribe de checkAILimit
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
    console.log('[ChatService] Ejecutando fallback para:', chat.message);

    this.kai.invokeKatuqAdvandceIntelligenceForProductRetriver(chat.message).subscribe({
      next: (response) => {
        console.log('[ChatService] Respuesta del backend:', response);

        // Validar que la respuesta existe y tiene contenido
        if (!response) {
          console.error('[ChatService] Respuesta vacía del backend');
          assistantMsg.text = 'Lo siento, no recibí respuesta del servidor.';
          if (user) { user.typing = false; }
          return;
        }

        // Extraer el resultado del JSON
        let resultText = '';

        if (typeof response === 'string') {
          // Si la respuesta es un string, usarla directamente
          resultText = response;
        } else if (response.result) {
          // Si tiene el campo "result", extraerlo
          resultText = response.result.toString();
        } else if (response.message) {
          // Algunos backends usan "message" en lugar de "result"
          resultText = response.message.toString();
        } else {
          // Si no tiene campos conocidos, intentar stringify del objeto completo
          console.warn('[ChatService] Respuesta en formato desconocido:', response);
          resultText = JSON.stringify(response);
        }

        console.log('[ChatService] Texto extraído:', resultText.substring(0, 100) + '...');

        // Añadir el mensaje al chat
        this.chat.filter(chats => {
          if (chats.id == chat.receiver) {
            // Asignar el texto al mensaje asistente
            assistantMsg.text = resultText.trim();

            // Añadir el mensaje al historial
            chats.message.push(assistantMsg);

            setTimeout(() => {
              if (user) { user.typing = false; }
              document.querySelector(".chat-history")?.scrollBy({ top: 250, behavior: 'smooth' });
            }, 300);
          }
        });
      },
      error: (err) => {
        console.error('[ChatService] Error al invocar backend:', err);

        // Interceptar error de límite del backend
        if (err.error?.error === 'AI_CHAT_LIMIT_REACHED') {
          this.aiLimitsService.showUpgradeModal('chat', err.error.message);
          assistantMsg.text = `⚠️ ${err.error.message}. Actualiza a Premium para chat ilimitado.`;
        } else {
          // Mensaje de error amigable
          assistantMsg.text = 'Lo siento, ocurrió un error al procesar tu mensaje. Por favor, intenta nuevamente.';
        }

        this.chat.filter(chats => {
          if (chats.id == chat.receiver) {
            chats.message.push(assistantMsg);
          }
        });

        if (user) { user.typing = false; }
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
