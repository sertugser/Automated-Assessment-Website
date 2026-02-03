import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Headphones, PlayCircle, PauseCircle, RotateCcw, CheckCircle2, BookOpen, Sparkles, ArrowLeft, List } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { generateListeningQuestions } from '../lib/ai-services';
import type { CEFRLevel } from '../lib/auth';

type Level = CEFRLevel;

interface ListeningExercise {
  id: string;
  title: string;
  text: string;
  questions: Array<{
    id: string;
    question: string;
    options: string[];
    correct: string;
  }>;
}

const EXERCISES_BY_LEVEL: Record<Level, ListeningExercise[]> = {
  A1: [
    {
      id: 'a1-1',
      title: 'My Name and My Pet',
      text: "Hello. I am Tom. I am ten years old. I have a dog. The dog is brown and his name is Max. I like my dog very much. I play with my dog every day after school. We run in the garden. Sometimes we go to the park. Max likes to play with a ball. I give him food and water every morning. My mum says Max is a good dog. I am happy with my pet.",
      questions: [
        { id: 'q1', question: 'What is the boy\'s name?', options: ['Tim', 'Tom', 'Sam', 'Ben'], correct: 'Tom' },
        { id: 'q2', question: 'What pet does he have?', options: ['A cat', 'A dog', 'A bird', 'A fish'], correct: 'A dog' },
        { id: 'q3', question: 'When does he play with the dog?', options: ['Never', 'Once a week', 'Every day', 'Only on Sunday'], correct: 'Every day' },
        { id: 'q4', question: 'What is the dog\'s name?', options: ['Tom', 'Max', 'Jack', 'Sam'], correct: 'Max' },
        { id: 'q5', question: 'What colour is the dog?', options: ['Black', 'Brown', 'White', 'Grey'], correct: 'Brown' },
        { id: 'q6', question: 'Where do they run?', options: ['At school', 'In the garden', 'In the park only', 'In the house'], correct: 'In the garden' },
        { id: 'q7', question: 'What does Max like to play with?', options: ['A stick', 'A ball', 'A rope', 'Nothing'], correct: 'A ball' },
        { id: 'q8', question: 'When does the boy give the dog food and water?', options: ['At night', 'Every morning', 'Only on weekends', 'Once a week'], correct: 'Every morning' },
        { id: 'q9', question: 'What does the boy\'s mum say about Max?', options: ['He is noisy', 'He is a good dog', 'He is lazy', 'He is big'], correct: 'He is a good dog' },
        { id: 'q10', question: 'How does the boy feel about his pet?', options: ['Sad', 'Angry', 'Happy', 'Worried'], correct: 'Happy' },
      ],
    },
    {
      id: 'a1-2',
      title: 'At School',
      text: "I am Anna. I go to school from Monday to Friday. My school is big and I like it. I have a teacher. Her name is Mrs Green. She is very nice. I like English. We read and write in class. I have a friend. His name is Leo. We sit together. We play at break time. After school I go home. I do my homework. Then I have dinner with my family.",
      questions: [
        { id: 'q1', question: 'What is the girl\'s name?', options: ['Anna', 'Leo', 'Mrs Green', 'Tom'], correct: 'Anna' },
        { id: 'q2', question: 'What is the teacher\'s name?', options: ['Mr Green', 'Mrs Green', 'Mrs Brown', 'Leo'], correct: 'Mrs Green' },
        { id: 'q3', question: 'What subject does she like?', options: ['Math', 'English', 'Science', 'Sport'], correct: 'English' },
        { id: 'q4', question: 'When does she go to school?', options: ['Only on Monday', 'From Monday to Friday', 'On weekends', 'Every day including Saturday'], correct: 'From Monday to Friday' },
        { id: 'q5', question: 'What does she say about her school?', options: ['It is small', 'It is big and she likes it', 'She does not like it', 'It is far away'], correct: 'It is big and she likes it' },
        { id: 'q6', question: 'What is her friend\'s name?', options: ['Anna', 'Mrs Green', 'Leo', 'Tom'], correct: 'Leo' },
        { id: 'q7', question: 'When do they play?', options: ['In class', 'At break time', 'After dinner', 'In the morning before school'], correct: 'At break time' },
        { id: 'q8', question: 'What does she do after school?', options: ['She goes to the park', 'She goes home and does her homework', 'She meets friends', 'She watches TV only'], correct: 'She goes home and does her homework' },
        { id: 'q9', question: 'Who does she have dinner with?', options: ['Only her friend', 'Her family', 'Her teacher', 'Nobody'], correct: 'Her family' },
        { id: 'q10', question: 'What does she do before dinner?', options: ['Plays with Leo', 'Reads a book', 'Does her homework', 'Goes to the market'], correct: 'Does her homework' },
      ],
    },
    {
      id: 'a1-3',
      title: 'My Family',
      text: "This is my family. I have a mum and a dad. My mum works at home. My dad goes to work by car. I have a brother. His name is Jack. He is older than me. I have a sister. Her name is Emma. She is younger than me. We live in a small house. The house has a garden. We have a cat. The cat is black and white. We all like our cat. We eat dinner together every day.",
      questions: [
        { id: 'q1', question: 'How many people are in the family (mum, dad, brother, sister, speaker)?', options: ['Three', 'Four', 'Five', 'Six'], correct: 'Five' },
        { id: 'q2', question: 'What is the brother\'s name?', options: ['Tom', 'Jack', 'Emma', 'Leo'], correct: 'Jack' },
        { id: 'q3', question: 'What pet do they have?', options: ['A dog', 'A cat', 'A bird', 'No pet'], correct: 'A cat' },
        { id: 'q4', question: 'Where does the mum work?', options: ['In an office', 'At home', 'In a shop', 'At school'], correct: 'At home' },
        { id: 'q5', question: 'How does the dad go to work?', options: ['By bus', 'By train', 'By car', 'On foot'], correct: 'By car' },
        { id: 'q6', question: 'What is the sister\'s name?', options: ['Jack', 'Emma', 'Tom', 'Anna'], correct: 'Emma' },
        { id: 'q7', question: 'Is Jack older or younger than the speaker?', options: ['Younger', 'Older', 'The same age', 'Not said'], correct: 'Older' },
        { id: 'q8', question: 'What kind of house do they live in?', options: ['A big house', 'A small house', 'A flat', 'No house'], correct: 'A small house' },
        { id: 'q9', question: 'What does the house have?', options: ['A pool', 'A garden', 'Two floors only', 'Nothing special'], correct: 'A garden' },
        { id: 'q10', question: 'When do they eat dinner together?', options: ['Never', 'Only on Sunday', 'Every day', 'Once a week'], correct: 'Every day' },
      ],
    },
    {
      id: 'a1-4',
      title: 'The Weather',
      text: "Today it is sunny. I like sunny days. I go to the park in the morning. I play with my ball. I meet my friends there. We run and play. Then I go home for lunch. Tomorrow it will be rainy. I will not go to the park. I will stay at home. I will read a book. Maybe I will watch TV too. My mum will make hot chocolate. I like rainy days at home.",
      questions: [
        { id: 'q1', question: 'What is the weather today?', options: ['Rainy', 'Sunny', 'Snowy', 'Windy'], correct: 'Sunny' },
        { id: 'q2', question: 'Where does the speaker go today?', options: ['School', 'The park', 'Home', 'The shop'], correct: 'The park' },
        { id: 'q3', question: 'What will the speaker do tomorrow?', options: ['Go to the park', 'Play with a ball', 'Stay at home and read', 'Go to school'], correct: 'Stay at home and read' },
        { id: 'q4', question: 'When does the speaker go to the park today?', options: ['In the evening', 'In the afternoon', 'In the morning', 'At night'], correct: 'In the morning' },
        { id: 'q5', question: 'Who does the speaker meet at the park?', options: ['Family only', 'Friends', 'Teachers', 'Nobody'], correct: 'Friends' },
        { id: 'q6', question: 'What will the weather be tomorrow?', options: ['Sunny', 'Rainy', 'Snowy', 'Windy'], correct: 'Rainy' },
        { id: 'q7', question: 'What will the speaker do tomorrow at home?', options: ['Only watch TV', 'Read a book and maybe watch TV', 'Go out', 'Sleep only'], correct: 'Read a book and maybe watch TV' },
        { id: 'q8', question: 'What will the speaker\'s mum make when it is rainy?', options: ['Coffee', 'Hot chocolate', 'Tea only', 'Nothing'], correct: 'Hot chocolate' },
        { id: 'q9', question: 'Does the speaker like rainy days at home?', options: ['No', 'Yes', 'Not said', 'Sometimes'], correct: 'Yes' },
        { id: 'q10', question: 'Where does the speaker go for lunch today?', options: ['To a café', 'Home', 'To school', 'To the shop'], correct: 'Home' },
      ],
    },
  ],
  A2: [
    {
      id: 'a2-1',
      title: "Sarah's Week",
      text: "Hi! My name is Sarah. I work in a shop in the town centre. I start at nine in the morning and I finish at five in the afternoon. I go to work by bus every day. The bus stop is near my house. On Saturday I usually go to the market. I buy fruit, vegetables and bread there. Sometimes I meet my sister at the market. On Sunday I stay at home. I read a book or I watch TV. I also clean my flat and cook for the week. I like my routine.",
      questions: [
        { id: 'q1', question: 'Where does Sarah work?', options: ['In an office', 'In a shop', 'In a school', 'In a hospital'], correct: 'In a shop' },
        { id: 'q2', question: 'How does she go to work?', options: ['By car', 'By bus', 'By train', 'On foot'], correct: 'By bus' },
        { id: 'q3', question: 'What does she do on Sunday?', options: ['She goes to the market', 'She goes to work', 'She stays at home', 'She meets friends'], correct: 'She stays at home' },
        { id: 'q4', question: 'Where is the shop?', options: ['Near her house', 'In the town centre', 'In a village', 'At the bus stop'], correct: 'In the town centre' },
        { id: 'q5', question: 'When does she start work?', options: ['At eight', 'At nine', 'At ten', 'At five'], correct: 'At nine' },
        { id: 'q6', question: 'When does she finish work?', options: ['At three', 'At four', 'At five', 'At six'], correct: 'At five' },
        { id: 'q7', question: 'Where is the bus stop?', options: ['Far from her house', 'Near her house', 'In the town centre', 'At the market'], correct: 'Near her house' },
        { id: 'q8', question: 'What does she buy at the market on Saturday?', options: ['Only bread', 'Fruit, vegetables and bread', 'Only fruit', 'Only vegetables'], correct: 'Fruit, vegetables and bread' },
        { id: 'q9', question: 'Who does she sometimes meet at the market?', options: ['Her teacher', 'Her sister', 'Her friend', 'Her mum'], correct: 'Her sister' },
        { id: 'q10', question: 'What does she do on Sunday at home?', options: ['Only cook', 'Read a book or watch TV, clean and cook', 'Only sleep', 'Only clean'], correct: 'Read a book or watch TV, clean and cook' },
      ],
    },
    {
      id: 'a2-2',
      title: 'At the Café',
      text: "Yesterday I went to a café with my friend. We wanted to talk and relax. We had coffee and cake. The café was nice and quiet. We sat by the window. We talked for two hours. We talked about work and about our holidays. Then we went for a walk in the park. The weather was good. I went home at six. I had a very nice afternoon.",
      questions: [
        { id: 'q1', question: 'Where did the speaker go yesterday?', options: ['To school', 'To a café', 'To work', 'To the market'], correct: 'To a café' },
        { id: 'q2', question: 'What did they have?', options: ['Tea and bread', 'Coffee and cake', 'Juice and fruit', 'Water and salad'], correct: 'Coffee and cake' },
        { id: 'q3', question: 'What did they do after the café?', options: ['They went home', 'They went for a walk in the park', 'They went to work', 'They went shopping'], correct: 'They went for a walk in the park' },
        { id: 'q4', question: 'Who did the speaker go to the café with?', options: ['Family', 'A friend', 'Colleagues', 'Alone'], correct: 'A friend' },
        { id: 'q5', question: 'What was the café like?', options: ['Noisy and busy', 'Nice and quiet', 'Small and dark', 'Expensive'], correct: 'Nice and quiet' },
        { id: 'q6', question: 'Where did they sit?', options: ['Outside', 'By the window', 'At the back', 'At the bar'], correct: 'By the window' },
        { id: 'q7', question: 'How long did they talk?', options: ['One hour', 'Two hours', 'Thirty minutes', 'Three hours'], correct: 'Two hours' },
        { id: 'q8', question: 'What did they talk about?', options: ['Only work', 'Work and holidays', 'Only holidays', 'Nothing special'], correct: 'Work and holidays' },
        { id: 'q9', question: 'What was the weather like?', options: ['Bad', 'Good', 'Rainy', 'Cold'], correct: 'Good' },
        { id: 'q10', question: 'When did the speaker go home?', options: ['At five', 'At six', 'At seven', 'At eight'], correct: 'At six' },
      ],
    },
    {
      id: 'a2-3',
      title: 'Shopping',
      text: "I need to buy some things today. I need milk, eggs and bread. I also want to buy a new shirt for work. The supermarket is near my house. I usually walk there. It takes about ten minutes. I like to go in the morning when it is quiet. The clothes shop is in the town centre. I go there by bus. The bus is cheap and fast. I will go to the supermarket first and then to the town centre.",
      questions: [
        { id: 'q1', question: 'What does the speaker need to buy?', options: ['Only milk', 'Milk, eggs and bread', 'Only a shirt', 'A bus ticket'], correct: 'Milk, eggs and bread' },
        { id: 'q2', question: 'How does the speaker go to the supermarket?', options: ['By bus', 'By car', 'On foot', 'By train'], correct: 'On foot' },
        { id: 'q3', question: 'Where is the clothes shop?', options: ['Near the house', 'In the town centre', 'Next to the supermarket', 'At the bus stop'], correct: 'In the town centre' },
        { id: 'q4', question: 'What else does the speaker want to buy?', options: ['A new shirt for work', 'A new bag', 'New shoes', 'A book'], correct: 'A new shirt for work' },
        { id: 'q5', question: 'How long does it take to walk to the supermarket?', options: ['Five minutes', 'About ten minutes', 'Twenty minutes', 'Thirty minutes'], correct: 'About ten minutes' },
        { id: 'q6', question: 'When does the speaker like to go to the supermarket?', options: ['In the evening', 'In the afternoon', 'In the morning when it is quiet', 'At night'], correct: 'In the morning when it is quiet' },
        { id: 'q7', question: 'How does the speaker go to the town centre?', options: ['On foot', 'By car', 'By bus', 'By train'], correct: 'By bus' },
        { id: 'q8', question: 'What does the speaker say about the bus?', options: ['It is slow', 'It is cheap and fast', 'It is expensive', 'It is always full'], correct: 'It is cheap and fast' },
        { id: 'q9', question: 'Where will the speaker go first?', options: ['The town centre', 'The supermarket', 'The clothes shop', 'Home'], correct: 'The supermarket' },
        { id: 'q10', question: 'Where will the speaker go after the supermarket?', options: ['Home', 'The town centre', 'Another shop', 'The bus stop'], correct: 'The town centre' },
      ],
    },
    {
      id: 'a2-4',
      title: 'Weekend Plans',
      text: "Next weekend I am going to visit my grandparents. They live in a small town about two hours away. I will take the train on Saturday morning. I will stay until Sunday evening. My grandmother will cook my favourite food. She always makes a big lunch. I am very excited. I have not seen them for three months. I will tell them about my new job and my new flat.",
      questions: [
        { id: 'q1', question: 'Who is the speaker going to visit?', options: ['Friends', 'Grandparents', 'Teachers', 'Colleagues'], correct: 'Grandparents' },
        { id: 'q2', question: 'How will the speaker travel?', options: ['By car', 'By bus', 'By train', 'On foot'], correct: 'By train' },
        { id: 'q3', question: 'How does the speaker feel?', options: ['Tired', 'Worried', 'Excited', 'Bored'], correct: 'Excited' },
        { id: 'q4', question: 'Where do the grandparents live?', options: ['In a big city', 'In a small town', 'In a village', 'Near the speaker'], correct: 'In a small town' },
        { id: 'q5', question: 'How far away do they live?', options: ['About one hour', 'About two hours', 'About thirty minutes', 'About five hours'], correct: 'About two hours' },
        { id: 'q6', question: 'When will the speaker take the train?', options: ['Friday evening', 'Saturday morning', 'Sunday morning', 'Saturday evening'], correct: 'Saturday morning' },
        { id: 'q7', question: 'How long will the speaker stay?', options: ['Until Saturday evening', 'Until Sunday evening', 'One day only', 'One week'], correct: 'Until Sunday evening' },
        { id: 'q8', question: 'What will the grandmother do?', options: ['Go shopping', 'Cook the speaker\'s favourite food', 'Clean the house', 'Nothing special'], correct: 'Cook the speaker\'s favourite food' },
        { id: 'q9', question: 'When did the speaker last see them?', options: ['One month ago', 'Two months ago', 'Three months ago', 'Six months ago'], correct: 'Three months ago' },
        { id: 'q10', question: 'What will the speaker tell them about?', options: ['Only the new job', 'The new job and the new flat', 'Only the new flat', 'Nothing'], correct: 'The new job and the new flat' },
      ],
    },
  ],
  B1: [
    {
      id: 'b1-1',
      title: 'A Problem at the Airport',
      text: "Last month I flew to Madrid for a meeting. I arrived at the airport two hours early because I was worried about traffic. When I got there, I saw on the screen that my flight was delayed by three hours because of a technical problem with the plane. I was tired and a bit angry. I went to a café, had a coffee and read my emails. Then I met another passenger who was also going to Madrid. We talked for a while and in the end we sat together on the plane. The delay was long but the flight was fine.",
      questions: [
        { id: 'q1', question: 'Why did the speaker arrive at the airport early?', options: ['The flight was early', 'He was worried about traffic', 'He had a meeting at the airport', 'He wanted to meet someone'], correct: 'He was worried about traffic' },
        { id: 'q2', question: 'Why was the flight delayed?', options: ['Bad weather', 'A technical problem with the plane', 'Too many passengers', 'No pilot'], correct: 'A technical problem with the plane' },
        { id: 'q3', question: 'What did the speaker do while waiting?', options: ['He slept', 'He went shopping', 'He had a coffee and read emails', 'He went back home'], correct: 'He had a coffee and read emails' },
        { id: 'q4', question: 'How did he feel about the delay at first?', options: ['Happy', 'Tired and a bit angry', 'Excited', 'He didn\'t care'], correct: 'Tired and a bit angry' },
        { id: 'q5', question: 'Where was the speaker flying to?', options: ['London', 'Madrid', 'Paris', 'Rome'], correct: 'Madrid' },
        { id: 'q6', question: 'How early did he arrive at the airport?', options: ['One hour', 'Two hours', 'Thirty minutes', 'Three hours'], correct: 'Two hours' },
        { id: 'q7', question: 'How long was the flight delayed?', options: ['One hour', 'Two hours', 'Three hours', 'Four hours'], correct: 'Three hours' },
        { id: 'q8', question: 'Who did the speaker meet at the airport?', options: ['A colleague', 'Another passenger going to Madrid', 'A pilot', 'Nobody'], correct: 'Another passenger going to Madrid' },
        { id: 'q9', question: 'What did they do on the plane?', options: ['They slept', 'They sat together', 'They read', 'They ate'], correct: 'They sat together' },
        { id: 'q10', question: 'How was the flight in the end?', options: ['Bad', 'Fine', 'Cancelled', 'Very long'], correct: 'Fine' },
      ],
    },
    {
      id: 'b1-2',
      title: 'A Lost Bag',
      text: "Last week I was on a train to London. When I got off, I left my bag on the seat. The bag had my laptop and my keys inside. I was very worried. I went to the lost property office at the station. A woman there was very helpful. She took my name and phone number. Two days later she called me. They had found my bag. I went back to the station and collected it. Everything was still inside. I was very relieved.",
      questions: [
        { id: 'q1', question: 'Where did the speaker leave the bag?', options: ['At home', 'On the train seat', 'At the office', 'In a café'], correct: 'On the train seat' },
        { id: 'q2', question: 'What was inside the bag?', options: ['Only keys', 'Laptop and keys', 'Only money', 'Books'], correct: 'Laptop and keys' },
        { id: 'q3', question: 'Who helped the speaker?', options: ['A man at the station', 'A woman at the lost property office', 'A train driver', 'A friend'], correct: 'A woman at the lost property office' },
        { id: 'q4', question: 'When did the speaker get the bag back?', options: ['The same day', 'Two days later', 'One week later', 'Never'], correct: 'Two days later' },
        { id: 'q5', question: 'Where was the train going?', options: ['London', 'Manchester', 'Paris', 'Birmingham'], correct: 'London' },
        { id: 'q6', question: 'When did this happen?', options: ['Yesterday', 'Last week', 'Last month', 'Last year'], correct: 'Last week' },
        { id: 'q7', question: 'What did the woman at the lost property office take?', options: ['The bag', 'The speaker\'s name and phone number', 'Money', 'Nothing'], correct: 'The speaker\'s name and phone number' },
        { id: 'q8', question: 'How did the speaker hear that the bag was found?', options: ['By email', 'She called him', 'He went back to the station', 'A friend told him'], correct: 'She called him' },
        { id: 'q9', question: 'Was everything still inside the bag?', options: ['No', 'Yes', 'Not said', 'Only the laptop'], correct: 'Yes' },
        { id: 'q10', question: 'How did the speaker feel when he got the bag back?', options: ['Angry', 'Very relieved', 'Sad', 'Worried'], correct: 'Very relieved' },
      ],
    },
    {
      id: 'b1-3',
      title: 'A Good Book',
      text: "I love reading. Last month I read a book about a man who travels around the world. The book was long but very interesting. The man visited twenty countries. He had many adventures. Sometimes he was in danger but he always found a solution. I could not stop reading. I finished the book in three days. I have already bought the next book by the same writer. I will start it tonight.",
      questions: [
        { id: 'q1', question: 'What was the book about?', options: ['A woman at home', 'A man who travels around the world', 'A child at school', 'A family in one city'], correct: 'A man who travels around the world' },
        { id: 'q2', question: 'How many countries did the man visit?', options: ['Five', 'Ten', 'Twenty', 'Fifty'], correct: 'Twenty' },
        { id: 'q3', question: 'How long did it take the speaker to finish the book?', options: ['One day', 'Three days', 'One week', 'One month'], correct: 'Three days' },
        { id: 'q4', question: 'What will the speaker do tonight?', options: ['Watch TV', 'Start the next book', 'Go out', 'Write a book'], correct: 'Start the next book' },
        { id: 'q5', question: 'When did the speaker read the book?', options: ['Last week', 'Last month', 'Last year', 'Yesterday'], correct: 'Last month' },
        { id: 'q6', question: 'Was the book long?', options: ['No', 'Yes, but very interesting', 'Very short', 'Not said'], correct: 'Yes, but very interesting' },
        { id: 'q7', question: 'What happened to the man in the book sometimes?', options: ['He was bored', 'He was in danger but found a solution', 'He stayed home', 'Nothing special'], correct: 'He was in danger but found a solution' },
        { id: 'q8', question: 'Could the speaker stop reading?', options: ['Yes', 'No, he could not stop', 'He did not try', 'Not said'], correct: 'No, he could not stop' },
        { id: 'q9', question: 'Has the speaker bought the next book?', options: ['No', 'Yes, by the same writer', 'He will buy it tomorrow', 'Not said'], correct: 'Yes, by the same writer' },
        { id: 'q10', question: 'Does the speaker love reading?', options: ['No', 'Yes', 'Not said', 'Sometimes'], correct: 'Yes' },
      ],
    },
    {
      id: 'b1-4',
      title: 'Moving House',
      text: "Next month I am moving to a new flat. The new flat is bigger and it has a garden. I am happy but I am also a bit sad. I have lived in my current flat for five years. I have many good memories here. My friends live nearby. In the new area I will not know anyone at first. But the new flat is near my office so I will not need to use the car. I will save time and money. I think it is the right decision.",
      questions: [
        { id: 'q1', question: 'Why is the speaker happy about the new flat?', options: ['It is cheaper', 'It is bigger and has a garden', 'It is in the same area', 'Friends live nearby'], correct: 'It is bigger and has a garden' },
        { id: 'q2', question: 'How long has the speaker lived in the current flat?', options: ['One year', 'Three years', 'Five years', 'Ten years'], correct: 'Five years' },
        { id: 'q3', question: 'What is one advantage of the new flat?', options: ['Friends live nearby', 'It is near the office', 'It is smaller', 'It has no garden'], correct: 'It is near the office' },
        { id: 'q4', question: 'How does the speaker feel about moving?', options: ['Only happy', 'Only sad', 'Happy and a bit sad', 'Angry'], correct: 'Happy and a bit sad' },
        { id: 'q5', question: 'When is the speaker moving?', options: ['This month', 'Next month', 'Next year', 'In two months'], correct: 'Next month' },
        { id: 'q6', question: 'What does the speaker have in the current flat?', options: ['Nothing special', 'Many good memories', 'No memories', 'Bad memories'], correct: 'Many good memories' },
        { id: 'q7', question: 'Where do the speaker\'s friends live?', options: ['In the new area', 'Nearby the current flat', 'Far away', 'Not said'], correct: 'Nearby the current flat' },
        { id: 'q8', question: 'Will the speaker know anyone in the new area at first?', options: ['Yes', 'No', 'Maybe', 'Not said'], correct: 'No' },
        { id: 'q9', question: 'What will the speaker save by moving?', options: ['Only money', 'Time and money', 'Only time', 'Nothing'], correct: 'Time and money' },
        { id: 'q10', question: 'What does the speaker think about the decision?', options: ['It is wrong', 'It is the right decision', 'He is not sure', 'He will change his mind'], correct: 'It is the right decision' },
      ],
    },
  ],
  B2: [
    {
      id: 'b2-1',
      title: 'Working from Home: Pros and Cons',
      text: "Over the past few years, remote work has become widespread, and many companies have adopted hybrid or fully remote models. Employees often report that they appreciate the flexibility and the lack of a daily commute. However, working from home also has drawbacks. It can be difficult to separate work from personal life, and some people end up working longer hours than they did in the office. In addition, isolation can affect well-being. Experts suggest that employers should offer clear guidelines, regular video calls, and opportunities for team building so that remote workers feel connected and supported.",
      questions: [
        { id: 'q1', question: 'What do many employees like about remote work?', options: ['Longer hours', 'Flexibility and no commute', 'More meetings', 'Strict rules'], correct: 'Flexibility and no commute' },
        { id: 'q2', question: 'According to the speaker, what is one downside of working from home?', options: ['Less flexibility', 'Difficulty separating work from personal life', 'Too many holidays', 'Lower pay'], correct: 'Difficulty separating work from personal life' },
        { id: 'q3', question: 'What can isolation affect?', options: ['Salary', 'Well-being', 'Technology', 'Commute'], correct: 'Well-being' },
        { id: 'q4', question: 'What do experts suggest employers should offer?', options: ['Fewer meetings', 'Clear guidelines, video calls, and team building', 'No guidelines', 'Only email'], correct: 'Clear guidelines, video calls, and team building' },
        { id: 'q5', question: 'What have many companies adopted?', options: ['Only office work', 'Hybrid or fully remote models', 'No flexibility', 'Strict rules only'], correct: 'Hybrid or fully remote models' },
        { id: 'q6', question: 'What do some people end up doing when working from home?', options: ['Working shorter hours', 'Working longer hours than in the office', 'Not working', 'Only emailing'], correct: 'Working longer hours than in the office' },
        { id: 'q7', question: 'What is difficult when working from home?', options: ['Using technology', 'Separating work from personal life', 'Finding a desk', 'Nothing'], correct: 'Separating work from personal life' },
        { id: 'q8', question: 'What should remote workers feel?', options: ['Isolated', 'Connected and supported', 'Stressed', 'Bored'], correct: 'Connected and supported' },
        { id: 'q9', question: 'What do employees often report appreciating?', options: ['Longer hours', 'Flexibility and lack of daily commute', 'More meetings', 'Strict rules'], correct: 'Flexibility and lack of daily commute' },
        { id: 'q10', question: 'What has remote work become over the past few years?', options: ['Less common', 'Widespread', 'Unpopular', 'Only for some jobs'], correct: 'Widespread' },
      ],
    },
    {
      id: 'b2-2',
      title: 'Healthy Lifestyle',
      text: "More and more people are trying to lead a healthier life. This includes eating a balanced diet, doing regular exercise, and getting enough sleep. Nevertheless, busy schedules often make it hard to stick to these habits. Some people find it useful to plan their meals in advance or to exercise at the same time every day. Others join a gym or a sports club so that they feel more motivated. Research shows that even small changes can make a significant difference to both physical and mental health over time.",
      questions: [
        { id: 'q1', question: 'What does the speaker say makes it hard to stick to healthy habits?', options: ['Lack of motivation', 'Busy schedules', 'No gyms', 'Bad weather'], correct: 'Busy schedules' },
        { id: 'q2', question: 'Why do some people join a gym or sports club?', options: ['To save money', 'To feel more motivated', 'To eat more', 'To sleep less'], correct: 'To feel more motivated' },
        { id: 'q3', question: 'What does research show about small changes?', options: ['They have no effect', 'They can make a significant difference to health', 'They only help physically', 'They are too difficult'], correct: 'They can make a significant difference to health' },
        { id: 'q4', question: 'What are more people trying to do?', options: ['Work more', 'Lead a healthier life', 'Eat less', 'Sleep less'], correct: 'Lead a healthier life' },
        { id: 'q5', question: 'What does a healthier life include?', options: ['Only exercise', 'Balanced diet, regular exercise, and enough sleep', 'Only diet', 'Only sleep'], correct: 'Balanced diet, regular exercise, and enough sleep' },
        { id: 'q6', question: 'What do some people find useful?', options: ['Eating less', 'Planning meals in advance or exercising at the same time every day', 'Never exercising', 'Sleeping less'], correct: 'Planning meals in advance or exercising at the same time every day' },
        { id: 'q7', question: 'What can small changes affect over time?', options: ['Only physical health', 'Both physical and mental health', 'Only mental health', 'Nothing'], correct: 'Both physical and mental health' },
        { id: 'q8', question: 'What do busy schedules often make hard?', options: ['Working', 'Sticking to healthy habits', 'Eating', 'Sleeping'], correct: 'Sticking to healthy habits' },
        { id: 'q9', question: 'Who does research show small changes can help?', options: ['Nobody', 'Only athletes', 'People over time', 'Only young people'], correct: 'People over time' },
        { id: 'q10', question: 'What do some people do to feel more motivated?', options: ['Eat more', 'Join a gym or sports club', 'Sleep more', 'Work less'], correct: 'Join a gym or sports club' },
      ],
    },
    {
      id: 'b2-3',
      title: 'Travel and Culture',
      text: "Travelling to another country can be a great way to learn about different cultures and to improve your language skills. Before you go, it is worth reading about the local customs and perhaps learning a few basic phrases in the language. When you are there, try to talk to local people and to try local food. You might also visit museums, markets, or places that are not in the guidebooks. Many people find that they return home with a better understanding of the world and of themselves.",
      questions: [
        { id: 'q1', question: 'What does the speaker suggest doing before you travel?', options: ['Buying a lot of clothes', 'Reading about local customs and learning some phrases', 'Staying in expensive hotels', 'Avoiding local people'], correct: 'Reading about local customs and learning some phrases' },
        { id: 'q2', question: 'What does the speaker recommend when you are there?', options: ['Only staying in the hotel', 'Talking to local people and trying local food', 'Only using guidebooks', 'Avoiding museums'], correct: 'Talking to local people and trying local food' },
        { id: 'q3', question: 'What do many people gain from travelling?', options: ['Only souvenirs', 'A better understanding of the world and themselves', 'More stress', 'Less money'], correct: 'A better understanding of the world and themselves' },
        { id: 'q4', question: 'What can travelling help you improve?', options: ['Only vocabulary', 'Language skills', 'Only grammar', 'Nothing'], correct: 'Language skills' },
        { id: 'q5', question: 'What is it worth doing before you go?', options: ['Buying a lot of clothes', 'Reading about local customs and learning basic phrases', 'Booking the most expensive hotel', 'Avoiding the language'], correct: 'Reading about local customs and learning basic phrases' },
        { id: 'q6', question: 'What might you also visit?', options: ['Only hotels', 'Museums, markets, or places not in guidebooks', 'Only guidebook places', 'Nothing'], correct: 'Museums, markets, or places not in guidebooks' },
        { id: 'q7', question: 'What do many people find when they return home?', options: ['Nothing', 'A better understanding of the world and themselves', 'More stress', 'Less money'], correct: 'A better understanding of the world and themselves' },
        { id: 'q8', question: 'What should you try when you are there?', options: ['Only stay in the hotel', 'Talk to local people and try local food', 'Avoid everyone', 'Only use guidebooks'], correct: 'Talk to local people and try local food' },
        { id: 'q9', question: 'What is travelling to another country a great way to do?', options: ['Save money', 'Learn about different cultures and improve language skills', 'Rest only', 'Work'], correct: 'Learn about different cultures and improve language skills' },
        { id: 'q10', question: 'What might you learn before you go?', options: ['Only the currency', 'A few basic phrases in the language', 'Nothing', 'Only the weather'], correct: 'A few basic phrases in the language' },
      ],
    },
    {
      id: 'b2-4',
      title: 'Social Media',
      text: "Social media has changed the way we communicate and share information. On the one hand, it allows us to stay in touch with friends and family who live far away, and it can be a useful tool for work and learning. On the other hand, spending too much time online can lead to stress, comparison with others, and less time for face-to-face contact. It is important to set limits and to be aware of how social media affects your mood. Many experts recommend turning off notifications or having screen-free time before bed.",
      questions: [
        { id: 'q1', question: 'What is one benefit of social media mentioned by the speaker?', options: ['Less stress', 'Staying in touch with people far away', 'No comparison with others', 'More sleep'], correct: 'Staying in touch with people far away' },
        { id: 'q2', question: 'What can spending too much time online lead to?', options: ['More face-to-face contact', 'Stress and comparison with others', 'Better mood', 'More free time'], correct: 'Stress and comparison with others' },
        { id: 'q3', question: 'What do many experts recommend?', options: ['Using social media all day', 'Turning off notifications or having screen-free time before bed', 'Never talking to family', 'Ignoring mood'], correct: 'Turning off notifications or having screen-free time before bed' },
        { id: 'q4', question: 'What has social media changed?', options: ['Only work', 'The way we communicate and share information', 'Only news', 'Nothing'], correct: 'The way we communicate and share information' },
        { id: 'q5', question: 'What can social media be useful for?', options: ['Only entertainment', 'Work and learning', 'Nothing', 'Only shopping'], correct: 'Work and learning' },
        { id: 'q6', question: 'What can too much time online lead to less of?', options: ['Stress', 'Face-to-face contact', 'Sleep', 'Work'], correct: 'Face-to-face contact' },
        { id: 'q7', question: 'What is important to do?', options: ['Use social media more', 'Set limits and be aware of how it affects your mood', 'Ignore mood', 'Never set limits'], correct: 'Set limits and be aware of how it affects your mood' },
        { id: 'q8', question: 'Who does social media allow us to stay in touch with?', options: ['Only colleagues', 'Friends and family who live far away', 'Nobody', 'Only friends nearby'], correct: 'Friends and family who live far away' },
        { id: 'q9', question: 'What should you be aware of?', options: ['Only time', 'How social media affects your mood', 'Only notifications', 'Nothing'], correct: 'How social media affects your mood' },
        { id: 'q10', question: 'When do experts recommend screen-free time?', options: ['In the morning', 'Before bed', 'At work', 'Never'], correct: 'Before bed' },
      ],
    },
  ],
  C1: [
    {
      id: 'c1-1',
      title: 'Climate Change: Mitigation and Adaptation',
      text: "Climate change presents unprecedented challenges for governments, businesses, and communities across the globe. Scientists agree that two types of response are necessary: mitigation and adaptation. Mitigation involves reducing greenhouse gas emissions, for example by shifting to renewable energy and improving energy efficiency. Adaptation, on the other hand, refers to adjusting to the impacts that are already occurring or are expected, such as rising sea levels, more frequent droughts, and extreme weather events. Vulnerable regions, including many developing countries, often have fewer resources to adapt, which raises questions of fairness and international cooperation. Policymakers are therefore under pressure to combine emission cuts with support for adaptation, while also ensuring that the transition to a low-carbon economy does not leave certain groups behind.",
      questions: [
        { id: 'q1', question: 'What does mitigation primarily involve?', options: ['Adapting to rising sea levels', 'Reducing greenhouse gas emissions', 'Supporting vulnerable regions only', 'Stopping international cooperation'], correct: 'Reducing greenhouse gas emissions' },
        { id: 'q2', question: 'Why is adaptation especially difficult for some regions?', options: ['They emit too much', 'They have fewer resources', 'They do not believe in climate change', 'They prefer mitigation only'], correct: 'They have fewer resources' },
        { id: 'q3', question: 'What concern does the speaker raise about the transition to a low-carbon economy?', options: ['It is too cheap', 'Certain groups might be left behind', 'It is not supported by scientists', 'It only helps developing countries'], correct: 'Certain groups might be left behind' },
        { id: 'q4', question: 'Which of the following is given as an example of adaptation?', options: ['Using renewable energy', 'Dealing with more frequent droughts', 'Closing factories', 'Reducing travel'], correct: 'Dealing with more frequent droughts' },
        { id: 'q5', question: 'What do scientists agree is necessary?', options: ['Only mitigation', 'Two types of response: mitigation and adaptation', 'Only adaptation', 'Nothing'], correct: 'Two types of response: mitigation and adaptation' },
        { id: 'q6', question: 'What does mitigation include shifting to?', options: ['More factories', 'Renewable energy and improving energy efficiency', 'More cars', 'Nothing'], correct: 'Renewable energy and improving energy efficiency' },
        { id: 'q7', question: 'What does adaptation refer to?', options: ['Stopping emissions', 'Adjusting to impacts already occurring or expected', 'Closing industries', 'Nothing'], correct: 'Adjusting to impacts already occurring or expected' },
        { id: 'q8', question: 'What raises questions of fairness?', options: ['Mitigation only', 'Vulnerable regions having fewer resources to adapt', 'International cooperation only', 'Nothing'], correct: 'Vulnerable regions having fewer resources to adapt' },
        { id: 'q9', question: 'Who is under pressure to combine emission cuts with support for adaptation?', options: ['Scientists only', 'Policymakers', 'Businesses only', 'Nobody'], correct: 'Policymakers' },
        { id: 'q10', question: 'What presents unprecedented challenges?', options: ['Only businesses', 'Climate change for governments, businesses, and communities', 'Only governments', 'Nothing'], correct: 'Climate change for governments, businesses, and communities' },
      ],
    },
    {
      id: 'c1-2',
      title: 'Education and Technology',
      text: "The integration of technology into education has accelerated in recent years, particularly with the rise of online learning platforms and digital tools. While this has created new opportunities for access and flexibility, it has also highlighted existing inequalities. Students without reliable internet or suitable devices may fall behind. Furthermore, there is ongoing debate about the effectiveness of screen-based learning compared to traditional classroom interaction. Educators are increasingly expected to combine both approaches and to develop digital literacy among students, while also addressing concerns about screen time and the need for critical thinking in an age of abundant information.",
      questions: [
        { id: 'q1', question: 'What has technology in education highlighted?', options: ['Only benefits', 'Existing inequalities', 'That screens are always better', 'That classrooms are obsolete'], correct: 'Existing inequalities' },
        { id: 'q2', question: 'Who may fall behind according to the speaker?', options: ['All students', 'Students without reliable internet or suitable devices', 'Only teachers', 'Only adults'], correct: 'Students without reliable internet or suitable devices' },
        { id: 'q3', question: 'What are educators increasingly expected to do?', options: ['Use only traditional methods', 'Combine both approaches and develop digital literacy', 'Ignore screen time', 'Remove technology'], correct: 'Combine both approaches and develop digital literacy' },
        { id: 'q4', question: 'What has accelerated in recent years?', options: ['Only classrooms', 'The integration of technology into education', 'Only textbooks', 'Nothing'], correct: 'The integration of technology into education' },
        { id: 'q5', question: 'What has technology created?', options: ['Only problems', 'New opportunities for access and flexibility', 'Only inequality', 'Nothing'], correct: 'New opportunities for access and flexibility' },
        { id: 'q6', question: 'What is there ongoing debate about?', options: ['Only benefits', 'The effectiveness of screen-based learning vs traditional classroom', 'Only screens', 'Nothing'], correct: 'The effectiveness of screen-based learning vs traditional classroom' },
        { id: 'q7', question: 'What do educators need to address?', options: ['Only technology', 'Screen time and the need for critical thinking', 'Only literacy', 'Nothing'], correct: 'Screen time and the need for critical thinking' },
        { id: 'q8', question: 'In what age is critical thinking needed?', options: ['Only in school', 'An age of abundant information', 'Only for adults', 'Not said'], correct: 'An age of abundant information' },
        { id: 'q9', question: 'What have online learning platforms contributed to?', options: ['Only problems', 'The rise of technology in education', 'Only inequality', 'Nothing'], correct: 'The rise of technology in education' },
        { id: 'q10', question: 'What should educators develop among students?', options: ['Only screen time', 'Digital literacy', 'Only traditional skills', 'Nothing'], correct: 'Digital literacy' },
      ],
    },
    {
      id: 'c1-3',
      title: 'Cities and Sustainability',
      text: "Urbanisation continues to shape the way we live, with more than half of the world's population now living in cities. This trend brings both opportunities and challenges. Cities can be engines of economic growth and innovation, but they also face problems such as congestion, pollution, and unequal access to housing and services. Sustainable urban planning aims to address these issues through better public transport, green spaces, and energy-efficient buildings. Success depends on cooperation between local authorities, businesses, and citizens, as well as on long-term investment in infrastructure that can cope with a growing population.",
      questions: [
        { id: 'q1', question: 'What problems do cities face according to the speaker?', options: ['Only economic growth', 'Congestion, pollution, and unequal access to housing and services', 'Too much green space', 'No innovation'], correct: 'Congestion, pollution, and unequal access to housing and services' },
        { id: 'q2', question: 'What does sustainable urban planning aim to do?', options: ['Reduce public transport', 'Address issues through better transport, green spaces, and energy-efficient buildings', 'Remove green spaces', 'Increase congestion'], correct: 'Address issues through better transport, green spaces, and energy-efficient buildings' },
        { id: 'q3', question: 'What does success depend on?', options: ['Only citizens', 'Cooperation between authorities, businesses, and citizens, and long-term investment', 'Short-term plans only', 'Ignoring infrastructure'], correct: 'Cooperation between authorities, businesses, and citizens, and long-term investment' },
        { id: 'q4', question: 'What continues to shape the way we live?', options: ['Only technology', 'Urbanisation', 'Only rural life', 'Nothing'], correct: 'Urbanisation' },
        { id: 'q5', question: 'Where does more than half of the world\'s population now live?', options: ['In villages', 'In cities', 'In the countryside', 'Nowhere'], correct: 'In cities' },
        { id: 'q6', question: 'What can cities be?', options: ['Only problems', 'Engines of economic growth and innovation', 'Only pollution', 'Nothing'], correct: 'Engines of economic growth and innovation' },
        { id: 'q7', question: 'What does sustainable urban planning aim to address through?', options: ['Only buildings', 'Better public transport, green spaces, and energy-efficient buildings', 'Only transport', 'Nothing'], correct: 'Better public transport, green spaces, and energy-efficient buildings' },
        { id: 'q8', question: 'What does success depend on besides cooperation?', options: ['Only citizens', 'Long-term investment in infrastructure', 'Short-term plans only', 'Nothing'], correct: 'Long-term investment in infrastructure' },
        { id: 'q9', question: 'What must infrastructure cope with?', options: ['Only current population', 'A growing population', 'Declining population', 'Nothing'], correct: 'A growing population' },
        { id: 'q10', question: 'Who must cooperate for success?', options: ['Only citizens', 'Local authorities, businesses, and citizens', 'Only businesses', 'Nobody'], correct: 'Local authorities, businesses, and citizens' },
      ],
    },
    {
      id: 'c1-4',
      title: 'Technology and Privacy',
      text: "The amount of personal data collected by companies and governments has grown enormously, raising serious questions about privacy and consent. While data can be used to improve services and to personalise user experiences, it can also be used for surveillance, targeted advertising, or discrimination. Laws such as the GDPR in Europe have tried to strengthen individuals' rights and to impose obligations on those who collect and process data. Nevertheless, technology evolves quickly and regulations often struggle to keep up. Many argue that a balance must be found between innovation and the protection of fundamental rights, and that users should be better informed about how their data is used.",
      questions: [
        { id: 'q1', question: 'What can personal data be used for besides improving services?', options: ['Only good things', 'Surveillance, targeted advertising, or discrimination', 'Nothing else', 'Only innovation'], correct: 'Surveillance, targeted advertising, or discrimination' },
        { id: 'q2', question: 'What have laws like the GDPR tried to do?', options: ['Collect more data', 'Strengthen individuals\' rights and impose obligations on data collectors', 'Remove privacy', 'Stop innovation'], correct: 'Strengthen individuals\' rights and impose obligations on data collectors' },
        { id: 'q3', question: 'What do many argue should happen?', options: ['No regulation', 'A balance between innovation and protection of rights; users better informed', 'Only innovation', 'Only protection'], correct: 'A balance between innovation and protection of rights; users better informed' },
        { id: 'q4', question: 'What has grown enormously?', options: ['Only companies', 'The amount of personal data collected', 'Only governments', 'Nothing'], correct: 'The amount of personal data collected' },
        { id: 'q5', question: 'What has this raised questions about?', options: ['Only innovation', 'Privacy and consent', 'Only technology', 'Nothing'], correct: 'Privacy and consent' },
        { id: 'q6', question: 'What can data be used to do for user experiences?', options: ['Nothing', 'Personalise user experiences', 'Only collect', 'Only delete'], correct: 'Personalise user experiences' },
        { id: 'q7', question: 'What do regulations often struggle to do?', options: ['Start', 'Keep up with technology', 'Stop', 'Nothing'], correct: 'Keep up with technology' },
        { id: 'q8', question: 'What must be found according to many?', options: ['Only innovation', 'A balance between innovation and protection of fundamental rights', 'Only protection', 'Nothing'], correct: 'A balance between innovation and protection of fundamental rights' },
        { id: 'q9', question: 'What should users be better informed about?', options: ['Only technology', 'How their data is used', 'Only companies', 'Nothing'], correct: 'How their data is used' },
        { id: 'q10', question: 'Where has the GDPR tried to strengthen rights?', options: ['Only in one country', 'In Europe', 'Nowhere', 'Everywhere'], correct: 'In Europe' },
      ],
    },
  ],
  C2: [
    {
      id: 'c2-1',
      title: 'Ethics, Accountability, and Artificial Intelligence',
      text: "The rapid proliferation of artificial intelligence has triggered intense debate about ethical boundaries, accountability, and the role of regulation. Although automation can bring significant benefits in efficiency and innovation, it also raises serious concerns. These include algorithmic bias, which can reinforce existing inequalities; threats to privacy and data protection; and the potential misuse of AI in surveillance, disinformation, or decision-making that affects people's lives. In response, a growing number of stakeholders—from researchers and industry leaders to civil society groups—are calling for robust regulatory frameworks that can keep pace with technological change. Such frameworks, they argue, should not only address current risks but also remain flexible enough to adapt to future developments, while at the same time safeguarding fundamental rights and ensuring that those who develop or deploy AI systems can be held accountable when things go wrong.",
      questions: [
        { id: 'q1', question: 'What does the speaker say algorithmic bias can do?', options: ['Improve efficiency', 'Reinforce existing inequalities', 'Protect privacy', 'Reduce surveillance'], correct: 'Reinforce existing inequalities' },
        { id: 'q2', question: 'According to the text, what should regulatory frameworks be able to do?', options: ['Ignore future developments', 'Keep pace with technological change', 'Replace civil society', 'Focus only on current benefits'], correct: 'Keep pace with technological change' },
        { id: 'q3', question: 'What is implied about accountability?', options: ['It is unnecessary for AI', 'Developers and deployers should be held accountable when things go wrong', 'Only researchers are responsible', 'Regulation makes accountability obsolete'], correct: 'Developers and deployers should be held accountable when things go wrong' },
        { id: 'q4', question: 'Which area is mentioned as a potential misuse of AI?', options: ['Medical research only', 'Surveillance, disinformation, or decision-making', 'Education only', 'Transport only'], correct: 'Surveillance, disinformation, or decision-making' },
        { id: 'q5', question: 'Who is described as calling for robust regulatory frameworks?', options: ['Only industry leaders', 'Only researchers', 'A growing number of stakeholders including researchers, industry, and civil society', 'Only governments'], correct: 'A growing number of stakeholders including researchers, industry, and civil society' },
        { id: 'q6', question: 'What has triggered intense debate?', options: ['Only regulation', 'The rapid proliferation of artificial intelligence', 'Only accountability', 'Nothing'], correct: 'The rapid proliferation of artificial intelligence' },
        { id: 'q7', question: 'What can automation bring?', options: ['Only problems', 'Significant benefits in efficiency and innovation', 'Only innovation', 'Nothing'], correct: 'Significant benefits in efficiency and innovation' },
        { id: 'q8', question: 'What concerns does AI raise?', options: ['Only benefits', 'Algorithmic bias, threats to privacy, and potential misuse', 'Only regulation', 'Nothing'], correct: 'Algorithmic bias, threats to privacy, and potential misuse' },
        { id: 'q9', question: 'What should frameworks remain flexible enough to do?', options: ['Ignore change', 'Adapt to future developments', 'Stop innovation', 'Nothing'], correct: 'Adapt to future developments' },
        { id: 'q10', question: 'What should frameworks safeguard?', options: ['Only efficiency', 'Fundamental rights', 'Only innovation', 'Nothing'], correct: 'Fundamental rights' },
      ],
    },
    {
      id: 'c2-2',
      title: 'Globalisation and the Economy',
      text: "Globalisation has led to an unprecedented interconnectedness of markets, labour, and capital across national borders. Proponents argue that it has lifted millions out of poverty and has allowed for the efficient allocation of resources. Critics, however, point to rising inequality within and between countries, the erosion of local industries, and the vulnerability of supply chains to shocks—as evidenced by recent disruptions. Moreover, the environmental footprint of global trade, including emissions from transport and the exploitation of natural resources, has come under scrutiny. Policymakers are thus faced with the challenge of fostering economic growth while mitigating negative social and environmental effects, and of ensuring that the benefits of globalisation are more widely distributed.",
      questions: [
        { id: 'q1', question: 'What do critics of globalisation point to?', options: ['Only benefits', 'Rising inequality, erosion of local industries, and supply chain vulnerability', 'Lack of trade', 'Too much local industry'], correct: 'Rising inequality, erosion of local industries, and supply chain vulnerability' },
        { id: 'q2', question: 'What has come under scrutiny?', options: ['Only poverty', 'The environmental footprint of global trade', 'Only labour', 'Only capital'], correct: 'The environmental footprint of global trade' },
        { id: 'q3', question: 'What challenge do policymakers face?', options: ['Stopping growth', 'Fostering growth while mitigating negative effects and distributing benefits more widely', 'Ignoring the environment', 'Removing trade'], correct: 'Fostering growth while mitigating negative effects and distributing benefits more widely' },
        { id: 'q4', question: 'What has globalisation led to?', options: ['Only poverty', 'Unprecedented interconnectedness of markets, labour, and capital', 'Only trade', 'Nothing'], correct: 'Unprecedented interconnectedness of markets, labour, and capital' },
        { id: 'q5', question: 'What do proponents argue globalisation has done?', options: ['Only harm', 'Lifted millions out of poverty and allowed efficient allocation of resources', 'Only trade', 'Nothing'], correct: 'Lifted millions out of poverty and allowed efficient allocation of resources' },
        { id: 'q6', question: 'What has recent disruptions evidenced?', options: ['Only benefits', 'The vulnerability of supply chains to shocks', 'Only labour', 'Nothing'], correct: 'The vulnerability of supply chains to shocks' },
        { id: 'q7', question: 'What does the environmental footprint of global trade include?', options: ['Only labour', 'Emissions from transport and exploitation of natural resources', 'Only capital', 'Nothing'], correct: 'Emissions from transport and exploitation of natural resources' },
        { id: 'q8', question: 'What must policymakers foster while mitigating?', options: ['Only trade', 'Economic growth while mitigating negative social and environmental effects', 'Only growth', 'Nothing'], correct: 'Economic growth while mitigating negative social and environmental effects' },
        { id: 'q9', question: 'What must the benefits of globalisation be?', options: ['Only for some', 'More widely distributed', 'Only for rich countries', 'Nothing'], correct: 'More widely distributed' },
        { id: 'q10', question: 'What are policymakers faced with?', options: ['Only growth', 'The challenge of fostering growth while mitigating effects and distributing benefits', 'Only trade', 'Nothing'], correct: 'The challenge of fostering growth while mitigating effects and distributing benefits' },
      ],
    },
    {
      id: 'c2-3',
      title: 'Science, Evidence, and Public Policy',
      text: "The relationship between scientific evidence and public policy has long been a subject of debate. In an ideal scenario, policy decisions would be informed by the best available research and would be revised as new evidence emerges. In practice, however, political considerations, economic interests, and public opinion often influence—and sometimes distort—the way evidence is interpreted and used. Furthermore, the communication of science to the public is not straightforward: findings can be oversimplified, taken out of context, or deliberately misrepresented. Strengthening the role of independent scientific advice and improving science literacy among both policymakers and the public are frequently cited as necessary steps if policy is to respond effectively to complex challenges such as climate change or public health crises.",
      questions: [
        { id: 'q1', question: 'What often influences the way evidence is interpreted in practice?', options: ['Only science', 'Political considerations, economic interests, and public opinion', 'Only the public', 'Only researchers'], correct: 'Political considerations, economic interests, and public opinion' },
        { id: 'q2', question: 'What is said about the communication of science to the public?', options: ['It is always clear', 'Findings can be oversimplified, taken out of context, or misrepresented', 'It is never distorted', 'Policymakers never listen'], correct: 'Findings can be oversimplified, taken out of context, or misrepresented' },
        { id: 'q3', question: 'What are cited as necessary steps?', options: ['Ignoring science', 'Strengthening independent scientific advice and improving science literacy', 'Removing public opinion', 'Stopping research'], correct: 'Strengthening independent scientific advice and improving science literacy' },
        { id: 'q4', question: 'What has long been a subject of debate?', options: ['Only politics', 'The relationship between scientific evidence and public policy', 'Only science', 'Nothing'], correct: 'The relationship between scientific evidence and public policy' },
        { id: 'q5', question: 'In an ideal scenario, what would policy decisions be informed by?', options: ['Only opinion', 'The best available research', 'Only politics', 'Nothing'], correct: 'The best available research' },
        { id: 'q6', question: 'What can influence and sometimes distort evidence?', options: ['Only science', 'Political considerations, economic interests, and public opinion', 'Only researchers', 'Nothing'], correct: 'Political considerations, economic interests, and public opinion' },
        { id: 'q7', question: 'What is not straightforward?', options: ['Only research', 'The communication of science to the public', 'Only policy', 'Nothing'], correct: 'The communication of science to the public' },
        { id: 'q8', question: 'What can findings be?', options: ['Only clear', 'Oversimplified, taken out of context, or deliberately misrepresented', 'Only accurate', 'Nothing'], correct: 'Oversimplified, taken out of context, or deliberately misrepresented' },
        { id: 'q9', question: 'Who needs improved science literacy?', options: ['Only scientists', 'Both policymakers and the public', 'Only the public', 'Nobody'], correct: 'Both policymakers and the public' },
        { id: 'q10', question: 'What must policy respond effectively to?', options: ['Only politics', 'Complex challenges such as climate change or public health crises', 'Only science', 'Nothing'], correct: 'Complex challenges such as climate change or public health crises' },
      ],
    },
    {
      id: 'c2-4',
      title: 'Democracy and Digital Media',
      text: "The spread of digital media has transformed how citizens access information and participate in democratic debate. While it has the potential to increase transparency and to give a voice to previously marginalised groups, it has also created new vulnerabilities. Misinformation and disinformation can spread rapidly, and echo chambers can reinforce polarisation. The role of traditional media as gatekeepers has been weakened, and the business models of many platforms depend on engagement rather than on accuracy. Consequently, there are growing calls for greater accountability of tech companies, for stronger regulation of political advertising, and for initiatives to promote media literacy so that citizens can critically evaluate the information they encounter.",
      questions: [
        { id: 'q1', question: 'What new vulnerabilities has digital media created?', options: ['None', 'Misinformation, disinformation, and echo chambers reinforcing polarisation', 'Only more transparency', 'Only more voices'], correct: 'Misinformation, disinformation, and echo chambers reinforcing polarisation' },
        { id: 'q2', question: 'What do many platforms\' business models depend on?', options: ['Accuracy only', 'Engagement rather than accuracy', 'Traditional media', 'Gatekeepers'], correct: 'Engagement rather than accuracy' },
        { id: 'q3', question: 'What are there growing calls for?', options: ['Less regulation', 'Greater accountability of tech companies, stronger regulation of political advertising, and media literacy', 'Removing digital media', 'Only traditional media'], correct: 'Greater accountability of tech companies, stronger regulation of political advertising, and media literacy' },
        { id: 'q4', question: 'What has digital media transformed?', options: ['Only news', 'How citizens access information and participate in democratic debate', 'Only politics', 'Nothing'], correct: 'How citizens access information and participate in democratic debate' },
        { id: 'q5', question: 'What potential does digital media have?', options: ['Only harm', 'To increase transparency and give a voice to marginalised groups', 'Only entertainment', 'Nothing'], correct: 'To increase transparency and give a voice to marginalised groups' },
        { id: 'q6', question: 'What can spread rapidly?', options: ['Only truth', 'Misinformation and disinformation', 'Only news', 'Nothing'], correct: 'Misinformation and disinformation' },
        { id: 'q7', question: 'What can echo chambers reinforce?', options: ['Only truth', 'Polarisation', 'Only debate', 'Nothing'], correct: 'Polarisation' },
        { id: 'q8', question: 'What has been weakened?', options: ['Only technology', 'The role of traditional media as gatekeepers', 'Only politics', 'Nothing'], correct: 'The role of traditional media as gatekeepers' },
        { id: 'q9', question: 'What should citizens be able to do?', options: ['Only read', 'Critically evaluate the information they encounter', 'Only share', 'Nothing'], correct: 'Critically evaluate the information they encounter' },
        { id: 'q10', question: 'What initiatives are there growing calls for?', options: ['Only regulation', 'To promote media literacy', 'Only accountability', 'Nothing'], correct: 'To promote media literacy' },
      ],
    },
  ],
};

const LEVEL_ORDER: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const WORDS_PER_SECOND = 2.5; // English TTS at 1.0 rate

function splitSentences(text: string): string[] {
  if (!text.trim()) return [];
  const parts = text.match(/[^.!?]+[.!?]+/g);
  if (!parts?.length) return [text.trim()];
  return parts.map((s) => s.trim()).filter(Boolean);
}

function getTimeInfo(sentences: string[], rate: number) {
  if (sentences.length === 0) return { totalDuration: 0, cumulativeStart: [] as number[], cumulativeEnd: [] as number[] };
  const wps = WORDS_PER_SECOND * Math.max(0.25, Math.min(2, rate));
  const durations = sentences.map((s) => (s.trim().split(/\s+/).filter(Boolean).length || 1) / wps);
  const cumulativeStart: number[] = [0];
  for (let i = 0; i < durations.length; i++) cumulativeStart.push(cumulativeStart[i] + durations[i]);
  const totalDuration = cumulativeStart[cumulativeStart.length - 1] ?? 0;
  const cumulativeEnd = cumulativeStart.slice(1);
  return { totalDuration, cumulativeStart, cumulativeEnd };
}

interface ListeningSectionProps {
  cefrLevel?: CEFRLevel | null;
}

export function ListeningSection({ cefrLevel }: ListeningSectionProps) {
  const { t } = useLanguage();
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<Level>(cefrLevel && LEVEL_ORDER.includes(cefrLevel) ? cefrLevel : 'B1');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [aiQuestions, setAiQuestions] = useState<ListeningExercise['questions'] | null>(null);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  const exercisesForLevel = EXERCISES_BY_LEVEL[selectedLevel];
  const exercise = selectedExerciseId
    ? exercisesForLevel.find((e) => e.id === selectedExerciseId) ?? null
    : null;

  const questions = aiQuestions ?? exercise?.questions ?? [];

  const sentences = useMemo(
    () => (exercise ? splitSentences(exercise.text) : []),
    [exercise?.id, exercise?.text]
  );

  const timeInfo = useMemo(() => getTimeInfo(sentences, 1), [sentences]);

  const playbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playbackStartTimeRef = useRef(0);
  const playbackSentenceIndexRef = useRef(0);

  const clearPlaybackInterval = () => {
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
  };

  useEffect(() => {
    setSelectedExerciseId(null);
    setAiQuestions(null);
  }, [selectedLevel]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  // Reset playback and answers whenever level or exercise changes (so previous exercise answers never persist)
  useEffect(() => {
    setCurrentSentenceIndex(0);
    setCurrentPlaybackTime(0);
    setAnswers({});
    setSubmitted(false);
    clearPlaybackInterval();
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
  }, [selectedLevel, selectedExerciseId]);

  useEffect(() => {
    if (!exercise) {
      setAiQuestions(null);
      return;
    }
    let active = true;
    setLoadingQuestions(true);
    generateListeningQuestions(exercise.text, selectedLevel, exercise.questions.length, exercise.title)
      .then((qs) => {
        if (!active) return;
        setAiQuestions(qs);
        setAnswers({});
        setSubmitted(false);
      })
      .catch((error) => {
        console.error('Failed to generate listening questions:', error);
        if (!active) return;
        setAiQuestions(exercise.questions);
      })
      .finally(() => {
        if (!active) return;
        setLoadingQuestions(false);
      });
    return () => {
      active = false;
    };
  }, [exercise?.id, selectedLevel]);

  // Extra safeguard: clear answers when the displayed exercise id changes (e.g. direct prop/context change)
  const exerciseIdRef = useRef<string | null>(null);
  useEffect(() => {
    const nextId = exercise?.id ?? null;
    if (exerciseIdRef.current !== nextId) {
      exerciseIdRef.current = nextId;
      if (nextId != null) {
        setAnswers({});
        setSubmitted(false);
      }
    }
  }, [exercise?.id]);

  useEffect(() => {
    return () => {
      clearPlaybackInterval();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const getBestEnglishVoice = (): SpeechSynthesisVoice | null => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    const en = voices.filter((v) => v.lang.startsWith('en'));
    if (en.length === 0) return null;
    const enUS = en.filter((v) => v.lang.startsWith('en-US'));
    const preferred = (list: SpeechSynthesisVoice[]) =>
      list.find((v) => /Google|Microsoft|Samantha|Daniel|Karen|Zira|David|Kate|Moira|Alex|Premium|Natural/i.test(v.name));
    return preferred(enUS) ?? preferred(en) ?? enUS[0] ?? en[0];
  };

  const speakSentence = (index: number, playOnlyOne = false) => {
    if (typeof window === 'undefined' || !window.speechSynthesis || !sentences[index]) return;
    playbackSentenceIndexRef.current = index;
    playbackStartTimeRef.current = Date.now();
    const utter = new SpeechSynthesisUtterance(sentences[index]);
    utter.lang = 'en-US';
    utter.volume = 1;
    const voice = getBestEnglishVoice();
    if (voice) utter.voice = voice;
    utter.rate = 1;
    const endTime = timeInfo.cumulativeEnd[index] ?? timeInfo.totalDuration;
    utter.onend = () => {
      setCurrentPlaybackTime(endTime);
      if (playOnlyOne) {
        clearPlaybackInterval();
        setIsPlaying(false);
        return;
      }
      if (index + 1 < sentences.length) {
        setCurrentSentenceIndex(index + 1);
        speakSentence(index + 1);
      } else {
        clearPlaybackInterval();
        setIsPlaying(false);
      }
    };
    utter.onerror = () => {
      clearPlaybackInterval();
      setIsPlaying(false);
    };
    window.speechSynthesis.speak(utter);
  };

  const speak = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis || !exercise) return;
    window.speechSynthesis.cancel();
    clearPlaybackInterval();
    setIsPlaying(true);
    const baseTime = timeInfo.cumulativeStart[currentSentenceIndex] ?? 0;
    playbackSentenceIndexRef.current = currentSentenceIndex;
    playbackStartTimeRef.current = Date.now() - (currentPlaybackTime - baseTime) * 1000;
    speakSentence(currentSentenceIndex);
    playbackIntervalRef.current = setInterval(() => {
      const idx = playbackSentenceIndexRef.current;
      const startTime = playbackStartTimeRef.current;
      const baseTime = timeInfo.cumulativeStart[idx] ?? 0;
      const endTime = timeInfo.cumulativeEnd[idx] ?? timeInfo.totalDuration;
      const elapsed = (Date.now() - startTime) / 1000;
      const t = Math.min(baseTime + elapsed, endTime);
      setCurrentPlaybackTime(t);
    }, 200);
  };

  const pause = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    clearPlaybackInterval();
    setIsPlaying(false);
  };

  const reset = () => {
    window.speechSynthesis?.cancel();
    clearPlaybackInterval();
    setIsPlaying(false);
    setCurrentSentenceIndex(0);
    setCurrentPlaybackTime(0);
    setAnswers({});
    setSubmitted(false);
  };

  const seekToTime = (seconds: number) => {
    clearPlaybackInterval();
    const t = Math.max(0, Math.min(timeInfo.totalDuration, seconds));
    setCurrentPlaybackTime(t);
    let idx = sentences.length > 0 ? sentences.length - 1 : 0;
    for (let i = 0; i < timeInfo.cumulativeEnd.length; i++) {
      if (t < timeInfo.cumulativeEnd[i]) {
        idx = i;
        break;
      }
      idx = i;
    }
    setCurrentSentenceIndex(idx);
  };

  const score = useMemo(() => {
    if (!exercise) return { correctCount: 0, total: 0 };
    const total = questions.length;
    const correctCount = questions.reduce((acc, q) => acc + (answers[q.id] === q.correct ? 1 : 0), 0);
    return { correctCount, total };
  }, [exercise, answers, questions]);

  const hasTTS = typeof window !== 'undefined' && 'speechSynthesis' in window;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-4xl font-bold text-gray-900">{t('nav.listening')}</h1>
      </motion.div>

      {/* Level selector - card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5 mb-6"
      >
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <span className="text-sm font-semibold text-gray-700 shrink-0">Level (CEFR):</span>
          <div className="flex flex-wrap gap-2">
            {LEVEL_ORDER.map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setSelectedLevel(lvl)}
                className={`relative min-w-[44px] px-3 py-2 rounded-lg border font-semibold text-sm transition-colors ${
                  selectedLevel === lvl
                    ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:border-gray-300'
                }`}
              >
                {lvl}
                {cefrLevel === lvl && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 text-amber-400" title="Your recommended level">
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-0 sm:mt-0 sm:ml-auto max-w-md">
            {cefrLevel ? (
              <>
                <Sparkles className="w-3.5 h-3.5 inline mr-0.5 text-amber-500 align-middle" />
                {t('listening.recommendedHint').replace('{level}', cefrLevel)}
              </>
            ) : (
              t('listening.anyLevelHint')
            )}
          </p>
        </div>
      </motion.div>

      {!exercise ? (
        /* List of listenings for this level */
        <>
          <div className="flex items-center gap-2 mb-4">
            <List className="w-5 h-5 text-indigo-600 shrink-0" />
            <h2 className="text-lg font-semibold text-gray-800">
              {selectedLevel} — {exercisesForLevel.length} listening{exercisesForLevel.length !== 1 ? 's' : ''}
            </h2>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {exercisesForLevel.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => setSelectedExerciseId(ex.id)}
                className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm text-left hover:border-indigo-400 hover:shadow-md hover:bg-indigo-50/30 transition-all group flex flex-col min-h-[120px]"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600 shrink-0 group-hover:bg-indigo-200 transition-colors">
                    <Headphones className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 leading-tight pt-0.5">{ex.title}</h3>
                </div>
                <p className="text-sm text-gray-500 mt-auto">{ex.questions.length} questions</p>
              </button>
            ))}
          </motion.div>
        </>
      ) : (
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg"
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedExerciseId(null)}
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors mb-2"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('common.backToList')}
              </button>
              <div className="flex items-center gap-3 w-full">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100">
                  <Headphones className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-gray-900">{exercise.title}</h2>
                  <p className="text-sm text-gray-600">
                    {hasTTS
                      ? 'Press Play to hear the passage (browser voice). If nothing plays, read the transcript in the panel on the right and answer the questions.'
                      : 'Your browser does not support audio. Read the transcript in the panel on the right and answer the questions (reading practice).'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {hasTTS && (
                  <>
                    <button
                      type="button"
                      onClick={isPlaying ? pause : speak}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:shadow-lg transition-all"
                    >
                      {isPlaying ? <PauseCircle className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
                      {isPlaying ? 'Duraklat' : 'Oynat'}
                    </button>
                    <button
                      type="button"
                      onClick={reset}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                    >
                      <RotateCcw className="w-5 h-5" />
                      Sıfırla
                    </button>
                  </>
                )}
              </div>
            </div>

            {hasTTS && timeInfo.totalDuration > 0 && (
              <div className="mt-4 rounded-xl bg-gray-50 border border-gray-100 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700 shrink-0 w-14">
                    {Math.floor(currentPlaybackTime / 60)}:{(Math.floor(currentPlaybackTime % 60)).toString().padStart(2, '0')}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, timeInfo.totalDuration)}
                    step={0.5}
                    value={currentPlaybackTime}
                    onChange={(e) => {
                      window.speechSynthesis?.cancel();
                      setIsPlaying(false);
                      seekToTime(Number(e.target.value));
                    }}
                    className="flex-1 min-w-[120px] max-w-md accent-indigo-600"
                  />
                  <span className="text-sm font-semibold text-gray-700 shrink-0 w-14">
                    {Math.floor(timeInfo.totalDuration / 60)}:{(Math.floor(timeInfo.totalDuration % 60)).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg"
          >
            <div className="flex items-center justify-between gap-4 mb-4">
              <h3 className="text-lg font-bold text-gray-900">Questions</h3>
              {loadingQuestions && (
                <span className="text-xs text-gray-500">AI questions are loading...</span>
              )}
              {submitted && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 text-green-700 border border-green-200 text-sm font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  Score: {score.correctCount}/{score.total}
                </div>
              )}
            </div>
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div key={q.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                  <div className="font-semibold text-gray-900 mb-3">
                    {idx + 1}. {q.question}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {q.options.map((opt) => {
                      const isSelected = answers[q.id] === opt;
                      const isCorrect = submitted && opt === q.correct;
                      const isWrongSelected = submitted && isSelected && opt !== q.correct;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            if (submitted) return;
                            setAnswers((prev) => ({ ...prev, [q.id]: opt }));
                          }}
                          className={`text-left px-4 py-3 rounded-xl border transition-colors ${
                            isCorrect
                              ? 'border-green-500 bg-green-50 text-green-800'
                              : isWrongSelected
                                ? 'border-red-500 bg-red-50 text-red-800'
                                : isSelected
                                  ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setAnswers({});
                  setSubmitted(false);
                }}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              >
                {t('common.clearAnswers')}
              </button>
              <button
                type="button"
                onClick={() => setSubmitted(true)}
                disabled={questions.some((q) => !answers[q.id])}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('common.checkAnswers')}
              </button>
            </div>
          </motion.div>
        </div>

        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              Transcript
            </h3>
            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{exercise.text}</p>
            <p className="text-xs text-gray-500 mt-3">You can read this if audio doesn't play, then answer the questions.</p>
          </motion.div>
        </div>
      </div>
      )}
    </div>
  );
}
