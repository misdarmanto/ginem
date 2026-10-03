import amqp, { type Channel, type ChannelModel, type Options } from 'amqplib'
import { StatusCodes } from 'http-status-codes'

import { appConfigs } from '../../configs/appConfig'
import { AppError } from '../../utilities/AppError'
import logger from '../../utilities/logger'
import { LOG_PREFIX } from './constants'

let connection: ChannelModel | undefined
let channel: Channel | undefined
let connecting: Promise<Channel> | undefined

export function getRabbitUrl(): string {
  return appConfigs.rabbitmq.url
}

export function getChatQueueName(): string {
  return appConfigs.rabbitmq.chatQueue
}

export async function getRabbitChannel(): Promise<Channel> {
  if (channel != null) return channel
  if (connecting != null) return await connecting

  connecting = (async () => {
    const url = getRabbitUrl()
    logger.info(`${LOG_PREFIX} connecting to RabbitMQ`)

    // `recovery` enables amqplib's automatic connection recovery (added after this
    // project's @types/amqplib was published, so it isn't part of `Options.Connect` yet).
    connection = await amqp.connect(url, { recovery: true } as Options.Connect)
    connection.on('error', (err: Error) => {
      logger.error(`${LOG_PREFIX} connection error: ${String(err)}`)
    })
    connection.on('disconnect', (err: Error) => {
      logger.warn(`${LOG_PREFIX} disconnected: ${String(err)}`)
      channel = undefined
    })

    const ch = await connection.createChannel()
    ch.on('error', (err: Error) => {
      logger.error(`${LOG_PREFIX} channel error: ${String(err)}`)
    })
    ch.on('close', () => {
      channel = undefined
    })

    await ch.assertQueue(getChatQueueName(), { durable: true })
    await ch.prefetch(1)

    channel = ch
    logger.info(`${LOG_PREFIX} ready (queue=${getChatQueueName()})`)
    return ch
  })()

  try {
    return await connecting
  } catch (error) {
    connecting = undefined
    channel = undefined
    connection = undefined
    logger.error(`${LOG_PREFIX} connect failed: ${String(error)}`)
    throw new AppError('Failed to connect to RabbitMQ', StatusCodes.SERVICE_UNAVAILABLE)
  } finally {
    connecting = undefined
  }
}

export async function closeRabbitConnection(): Promise<void> {
  try {
    if (channel != null) {
      await channel.close()
      channel = undefined
    }
    if (connection != null) {
      await connection.close()
      connection = undefined
    }
    logger.info(`${LOG_PREFIX} disconnected`)
  } catch (error) {
    logger.warn(`${LOG_PREFIX} close failed: ${String(error)}`)
    channel = undefined
    connection = undefined
  }
}
