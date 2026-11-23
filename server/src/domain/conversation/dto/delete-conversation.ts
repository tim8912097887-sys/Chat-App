export class DeleteConversationDto {
  conversationId: string;
  deletedAt: string;

  private constructor(conversationId: string, deletedAt: Date) {
    this.conversationId = conversationId;
    this.deletedAt = deletedAt.toISOString();
  }

  static toDomainConversationDeleted(
    conversationId: string,
    deletedAt: Date,
  ): DeleteConversationDto {
    return new DeleteConversationDto(conversationId, deletedAt);
  }
}
