# Sample Python program to demonstrate List operations of Redis and   

# redis-py

import redis

 

# Create a redis client

redisClient = redis.StrictRedis(host='redis',

                                port=6379,

                                db=0)

 

# Add values to the Redis list through the HEAD position of the list


redisClient.lpush('LanguageList', "Python")

redisClient.lpush('LanguageList', "Python")

redisClient.lpush('LanguageList', "Python")

redisClient.lpush('LanguageList', "Python")

redisClient.lpush('LanguageList', "Python")

redisClient.lpush('LanguageList', "Python")

redisClient.lpush('LanguageList', "Python")

redisClient.lpush('LanguageList', "Python")
 

quit()
